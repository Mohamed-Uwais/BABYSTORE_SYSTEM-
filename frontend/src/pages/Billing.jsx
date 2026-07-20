import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import BarcodeScanner from '../components/BarcodeScanner';
import Receipt from '../components/Receipt';
import PageWrapper from '../components/PageWrapper';
import EmptyState from '../components/EmptyState';
import useKeyboardShortcuts from '../hooks/useKeyboardShortcuts';

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash', icon: 'banknote' },
  { value: 'card', label: 'Card', icon: 'credit-card' },
  { value: 'bank_transfer', label: 'Bank Transfer', icon: 'landmark' },
  { value: 'store_credit', label: 'Credit (Pay Later)', icon: 'gift' },
];

function money(n) {
  return `Rs. ${Number(n || 0).toFixed(2)}`;
}

function getTierPrice(priceTiers, quantity, retailPrice) {
  if (!priceTiers?.length) return null;
  let matched = null;
  for (const t of priceTiers) {
    if (quantity >= t.min_quantity) matched = t;
  }
  if (matched) return { tier_price: Number(matched.tier_price), min_quantity: matched.min_quantity, label: matched.label };
  return null;
}

export default function Billing() {
  const { user, hasPermission } = useAuth();
  const toast = useToast();
  const isOwner = hasPermission('settings');

  const [products, setProducts] = useState([]);
  const [bestSellers, setBestSellers] = useState([]);
  const [search, setSearch] = useState('');
  const [loadingProducts, setLoadingProducts] = useState(true);

  const [cart, setCart] = useState([]);

  const [phoneInput, setPhoneInput] = useState('');
  const [customer, setCustomer] = useState(null);
  const [customerSearchState, setCustomerSearchState] = useState('idle');
  const [registerAsLoyalty, setRegisterAsLoyalty] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');

  const [payments, setPayments] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successOrder, setSuccessOrder] = useState(null);

  const [receiptOrderId, setReceiptOrderId] = useState(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanMessage, setScanMessage] = useState(null);
  const productsRef = useRef([]);
  const searchRef = useRef(null);
  const phoneRef = useRef(null);
  const [showShortcuts, setShowShortcuts] = useState(false);

  const [fulfillment, setFulfillment] = useState('pickup');
  const [deliveryMethod, setDeliveryMethod] = useState('self_delivery');
  const [zones, setZones] = useState([]);
  const [couriers, setCouriers] = useState([]);
  const [selectedZone, setSelectedZone] = useState('');
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [receiverName, setReceiverName] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [receiverAddress, setReceiverAddress] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [tagFilter, setTagFilter] = useState('');

  const [appliedPromos, setAppliedPromos] = useState([]);
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [freeDelivery, setFreeDelivery] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponApplied, setCouponApplied] = useState(null);
  const [couponError, setCouponError] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);

  const [manualDiscountType, setManualDiscountType] = useState('fixed');
  const [manualDiscountValue, setManualDiscountValue] = useState('');

  const [returnMode, setReturnMode] = useState(false);
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [returnSearch, setReturnSearch] = useState('');
  const [returnSearchResults, setReturnSearchResults] = useState([]);
  const [returnSearching, setReturnSearching] = useState(false);
  const [returnOrder, setReturnOrder] = useState(null);
  const [returnItems, setReturnItems] = useState([]);
  const [returnSelections, setReturnSelections] = useState([]);
  const [returnRefundMethod, setReturnRefundMethod] = useState('cash');
  const [returnProcessing, setReturnProcessing] = useState(false);
  const [returnResult, setReturnResult] = useState(null);

  useEffect(() => {
    loadProducts();
    loadBestSellers();
    client.get('/delivery/zones').then(r => setZones(r.data.data)).catch(() => {});
    client.get('/couriers').then(r => setCouriers(r.data.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    productsRef.current = products;
  }, [products]);

  useEffect(() => {
    if (customer && fulfillment === 'delivery') {
      if (!receiverName) setReceiverName(customer.full_name || '');
      if (!receiverPhone) setReceiverPhone(customer.phone || '');
      if (!receiverAddress && customer.address) setReceiverAddress(customer.address);
    }
  }, [customer, fulfillment]);

  async function loadProducts() {
    setLoadingProducts(true);
    try {
      const res = await client.get('/products');
      setProducts(res.data.data);
    } finally {
      setLoadingProducts(false);
    }
  }

  async function loadBestSellers() {
    const res = await client.get('/orders/best-sellers');
    setBestSellers(res.data.data);
  }

  const filteredProducts = useMemo(() => {
    let result = products;
    if (tagFilter) {
      result = result.filter(p => p.tags?.some(t => t.name === tagFilter));
    }
    const q = search.trim().toLowerCase();
    if (!q) return result;
    return result.filter(
      (p) =>
        p.name?.toLowerCase().includes(q) ||
        p.variant_label?.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q) ||
        p.barcode?.toLowerCase().includes(q) ||
        p.tags?.some(t => t.name.toLowerCase().includes(q)),
    );
  }, [products, search, tagFilter]);

  const allTags = useMemo(() => {
    const set = new Set();
    products.forEach(p => p.tags?.forEach(t => set.add(t.name)));
    return [...set].sort();
  }, [products]);

  function addToCart(p) {
    if (!p.variant_id || p.current_stock <= 0) return;
    setCart((prev) => {
      const existing = prev.find((l) => l.variant_id === p.variant_id);
      if (existing) {
        if (existing.quantity >= p.current_stock) return prev;
        const newQty = existing.quantity + 1;
        const tier = getTierPrice(existing.price_tiers, newQty, existing.base_price);
        const newPrice = tier ? tier.tier_price / tier.min_quantity : existing.base_price;
        return prev.map((l) =>
          l.variant_id === p.variant_id ? { ...l, quantity: newQty, unit_price: newPrice, active_tier: tier } : l,
        );
      }
      const basePrice = Number(p.retail_price);
      const tiers = p.price_tiers || [];
      return [
        ...prev,
        {
          variant_id: p.variant_id,
          sku: p.sku,
          variant_label: p.variant_label,
          product_name: p.name || p.product_name,
          unit_price: basePrice,
          base_price: basePrice,
          quantity: 1,
          max_stock: p.current_stock,
          price_tiers: tiers,
          active_tier: null,
        },
      ];
    });
  }

  const handleScan = useCallback((code) => {
    const scanned = String(code).trim();
    const match = productsRef.current.find((p) => p.barcode && String(p.barcode).trim() === scanned);

    if (!match) {
      setScanMessage({ type: 'error', text: `Barcode not recognized: ${scanned}` });
      return;
    }
    if (match.current_stock <= 0) {
      setScanMessage({ type: 'error', text: `${match.name} — out of stock` });
      return;
    }
    addToCart(match);
    setScanMessage({ type: 'success', text: `Added: ${match.name} · ${match.variant_label}` });
  }, []);

  function updateQty(variant_id, qty) {
    setCart((prev) =>
      prev
        .map((l) => {
          if (l.variant_id !== variant_id) return l;
          const newQty = Math.min(Math.max(qty, 0), l.max_stock);
          const tier = getTierPrice(l.price_tiers, newQty, l.base_price);
          const newPrice = tier ? tier.tier_price / tier.min_quantity : (l.base_price || l.unit_price);
          return { ...l, quantity: newQty, unit_price: newPrice, active_tier: tier };
        })
        .filter((l) => l.quantity > 0),
    );
  }

  function updateUnitPrice(variant_id, price) {
    setCart((prev) => prev.map((l) => l.variant_id === variant_id ? { ...l, unit_price: Math.max(0, price) } : l));
  }

  function removeLine(variant_id) {
    setCart((prev) => prev.filter((l) => l.variant_id !== variant_id));
  }

  async function searchReturnOrders() {
    if (!returnSearch.trim()) return;
    setReturnSearching(true);
    try {
      const r = await client.get(`/orders/search-for-return?q=${encodeURIComponent(returnSearch.trim())}`);
      setReturnSearchResults(r.data.data || []);
    } catch { setReturnSearchResults([]); }
    finally { setReturnSearching(false); }
  }

  async function selectReturnOrder(order) {
    setReturnOrder(order);
    try {
      const r = await client.get(`/orders/${order.id}/return-items`);
      setReturnItems(r.data.data || []);
      setReturnSelections([]);
    } catch { setReturnItems([]); }
  }

  function toggleReturnSelection(item, qty) {
    setReturnSelections(prev => {
      const existing = prev.find(s => s.order_item_id === item.order_item_id);
      if (existing) {
        if (qty <= 0) return prev.filter(s => s.order_item_id !== item.order_item_id);
        return prev.map(s => s.order_item_id === item.order_item_id ? { ...s, quantity: Math.min(qty, item.returnable) } : s);
      }
      if (qty <= 0) return prev;
      return [...prev, { order_item_id: item.order_item_id, variant_id: item.variant_id, quantity: Math.min(qty, item.returnable), product_name: item.product_name, variant_label: item.variant_label, unit_price: item.line_total / item.quantity, reason: '' }];
    });
  }

  function confirmReturnSelections() {
    const negativeLines = returnSelections.map(s => ({
      variant_id: s.variant_id,
      product_name: s.product_name,
      variant_label: s.variant_label,
      unit_price: s.unit_price,
      quantity: s.quantity,
      order_item_id: s.order_item_id,
      isReturn: true,
    }));
    setCart(prev => [...prev.filter(l => !l.isReturn), ...negativeLines]);
    setReturnMode(true);
    setReturnModalOpen(false);
  }

  const returnTotal = useMemo(
    () => cart.filter(l => l.isReturn).reduce((sum, l) => sum + l.unit_price * l.quantity, 0),
    [cart]
  );
  const newItemsTotal = useMemo(
    () => cart.filter(l => !l.isReturn).reduce((sum, l) => sum + l.unit_price * l.quantity, 0),
    [cart]
  );
  async function processReturn() {
    setError('');
    setReturnProcessing(true);
    try {
      const returnLines = cart.filter(l => l.isReturn);
      const newLines = cart.filter(l => !l.isReturn);

      const returnRes = await client.post('/orders/return-exchange', {
        original_order_id: returnOrder.id,
        return_items: returnLines.map(l => ({ order_item_id: l.order_item_id, quantity: l.quantity, reason: 'Customer return' })),
        refund_method: netTotal < 0 ? returnRefundMethod : 'none',
        customer_id: customer?.id || null,
      });

      if (newLines.length > 0) {
        const exchangeDiscount = promoDiscount + manualDiscount + returnTotal;
        const exchangeGrandTotal = Math.max(0, newItemsTotal - exchangeDiscount + effectiveDeliveryFee);
        const exchangePayments = exchangeGrandTotal <= 0
          ? [{ payment_method: 'cash', amount: 0 }]
          : payments.map(p => ({ payment_method: p.method, amount: parseFloat(p.amount) }));
        const payload = {
          channel: 'pos',
          customer_id: customer?.id || null,
          cashier_id: user?.id || null,
          items: newLines.map(l => ({ variant_id: l.variant_id, quantity: l.quantity, unit_price: l.unit_price, discount_amount: 0 })),
          discount_total: exchangeDiscount,
          applied_promotions: appliedPromos,
          coupon_code: couponApplied || null,
          payments: exchangePayments,
          fulfillment_type: getEffectiveFulfillmentType(),
          delivery_fee: effectiveDeliveryFee,
          delivery_zone_id: selectedZone || null,
          delivery_address: receiverAddress || null,
          notes: deliveryNotes || `Exchange from ${returnOrder.order_number} (return credit: Rs. ${returnTotal.toFixed(2)})`,
        };
        if (fulfillment === 'delivery') {
          const courier = getSelectedCourier();
          payload.delivery = { courier_id: courier?.id || null, tracking_number: trackingNumber || null, receiver_name: receiverName || null, receiver_phone: receiverPhone || null, receiver_address: receiverAddress || null };
        }
        const orderRes = await client.post('/orders/checkout', payload);
        setSuccessOrder(orderRes.data.data);
        setReceiptOrderId(orderRes.data.data.orderId);
      }

      const refundAmt = returnRes.data.data.refund_total;
      if (netTotal < 0) {
        toast.success(`Return processed! Refund: Rs. ${Math.abs(netTotal).toFixed(2)} via ${returnRefundMethod === 'store_credit' ? 'credit reduction' : 'cash'}`);
      } else if (newLines.length > 0) {
        toast.success('Exchange complete!');
      } else {
        toast.success(`Return processed! Refund: Rs. ${refundAmt.toFixed(2)} via ${returnRefundMethod === 'store_credit' ? 'credit reduction' : 'cash'}`);
      }

      setReturnResult(returnRes.data.data);
      setCart([]);
      setPayments([]);
      setReturnMode(false);
      setReturnOrder(null);
      setReturnSelections([]);
      setReturnItems([]);
      setManualDiscountValue('');
      clearCustomer();
      resetDelivery();
      loadProducts();
    } catch (err) {
      setError(err.response?.data?.message ?? 'Return processing failed');
      toast.error('Return processing failed');
    } finally {
      setReturnProcessing(false);
    }
  }

  function cancelReturnMode() {
    setCart(prev => prev.filter(l => !l.isReturn));
    setReturnMode(false);
    setReturnOrder(null);
    setReturnSelections([]);
    setReturnItems([]);
    setReturnResult(null);
  }

  useEffect(() => {
    if (cart.length === 0) {
      setAppliedPromos([]); setPromoDiscount(0); setFreeDelivery(false);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const r = await client.post('/promotions/calculate', {
          items: cart.map(l => ({ variant_id: l.variant_id, quantity: l.quantity, unit_price: l.unit_price })),
          couponCode: couponApplied || undefined,
        });
        setAppliedPromos(r.data.data.appliedPromotions || []);
        setPromoDiscount(r.data.data.totalDiscount || 0);
        setFreeDelivery(r.data.data.freeDelivery || false);
      } catch { /* ignore */ }
    }, 300);
    return () => clearTimeout(timer);
  }, [cart, couponApplied]);

  async function applyCoupon() {
    if (!couponCode.trim()) return;
    setCouponLoading(true); setCouponError('');
    try {
      const r = await client.post('/promotions/calculate', {
        items: cart.map(l => ({ variant_id: l.variant_id, quantity: l.quantity, unit_price: l.unit_price })),
        couponCode: couponCode.trim(),
      });
      if (r.data.data.couponError) {
        setCouponError(r.data.data.couponError);
      } else {
        setCouponApplied(couponCode.trim());
        setCouponError('');
        setAppliedPromos(r.data.data.appliedPromotions || []);
        setPromoDiscount(r.data.data.totalDiscount || 0);
        setFreeDelivery(r.data.data.freeDelivery || false);
        toast.success(`Coupon ${couponCode.trim()} applied!`);
      }
    } catch { setCouponError('Failed to validate coupon'); }
    finally { setCouponLoading(false); }
  }

  function removeCoupon() {
    setCouponApplied(null); setCouponCode(''); setCouponError('');
  }

  const subtotal = useMemo(
    () => cart.reduce((sum, l) => sum + l.unit_price * l.quantity, 0),
    [cart],
  );
  const manualDiscount = useMemo(() => {
    const v = parseFloat(manualDiscountValue) || 0;
    if (v <= 0) return 0;
    if (manualDiscountType === 'percentage') return Math.min(subtotal * v / 100, subtotal);
    return Math.min(v, subtotal);
  }, [subtotal, manualDiscountType, manualDiscountValue]);
  const effectiveDeliveryFee = freeDelivery ? 0 : deliveryFee;
  const applicablePromo = returnMode && newItemsTotal === 0 ? 0 : promoDiscount;
  const applicableManual = returnMode && newItemsTotal === 0 ? 0 : manualDiscount;
  const grandTotal = returnMode ? newItemsTotal - applicablePromo - applicableManual + effectiveDeliveryFee - returnTotal : subtotal - promoDiscount - manualDiscount + effectiveDeliveryFee;
  const netTotal = newItemsTotal - applicablePromo - applicableManual + effectiveDeliveryFee - returnTotal;

  async function handleZoneChange(zoneId) {
    setSelectedZone(zoneId);
    if (!zoneId) { setDeliveryFee(0); setDeliveryBreakdown(null); return; }
    try {
      const totalWeight = cart.reduce((sum, l) => {
        const prod = products.find(p => p.variant_id === l.variant_id);
        return sum + (prod?.weight_grams || 0) * l.quantity;
      }, 0);
      const r = await client.get(`/delivery/calculate-fee?zone_id=${zoneId}&total_weight_grams=${totalWeight}&total_packs=${totalQty}`);
      setDeliveryFee(Number(r.data.data.total_fee) || 0);
      setDeliveryBreakdown(r.data.data);
    } catch { setDeliveryFee(0); setDeliveryBreakdown(null); }
  }

  const paidSoFar = useMemo(
    () => payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0),
    [payments],
  );
  const remaining = grandTotal - paidSoFar;

  async function lookupCustomer() {
    if (!phoneInput.trim()) return;
    setCustomerSearchState('searching');
    setError('');
    try {
      const res = await client.get(`/customers/phone/${encodeURIComponent(phoneInput.trim())}`);
      if (res.data.data) {
        setCustomer(res.data.data);
        setCustomerSearchState('idle');
        if (Number(res.data.data.credit_balance) !== 0) {
          toast.warning(`Customer has Rs. ${Math.abs(Number(res.data.data.credit_balance)).toFixed(2)} outstanding credit`);
        }
      } else {
        setCustomer(null);
        setCustomerSearchState('not_found');
      }
    } catch {
      setCustomerSearchState('idle');
      setError('Customer lookup failed');
    }
  }

  async function createCustomer() {
    try {
      const res = await client.post('/customers', {
        phone: phoneInput.trim(),
        full_name: newCustomerName.trim() || null,
        customer_type: registerAsLoyalty ? 'loyalty' : 'walk_in',
      });
      setCustomer(res.data.data);
      setCustomerSearchState('idle');
      setNewCustomerName('');
      toast.success('Customer created');
    } catch {
      setError('Could not create customer');
    }
  }

  function clearCustomer() {
    setCustomer(null);
    setPhoneInput('');
    setCustomerSearchState('idle');
    setPayments((prev) => prev.filter((p) => p.method !== 'store_credit'));
  }

  const [splitMode, setSplitMode] = useState(false);

  function setFullCash() {
    setSplitMode(false);
    setPayments([{ method: 'cash', amount: grandTotal.toFixed(2) }]);
  }

  function enableSplit() {
    setSplitMode(true);
    if (payments.length === 0) {
      setPayments([{ method: 'cash', amount: '' }]);
    }
  }

  function togglePaymentMethod(method) {
    if (splitMode) {
      const exists = payments.find((p) => p.method === method);
      if (exists) {
        setPayments((prev) => prev.filter((p) => p.method !== method));
      } else {
        setPayments((prev) => [...prev, { method, amount: '' }]);
      }
    } else {
      setPayments([{ method, amount: grandTotal.toFixed(2) }]);
    }
  }

  function updatePaymentAmount(method, amount) {
    setPayments((prev) => prev.map((p) => (p.method === method ? { ...p, amount } : p)));
  }

  const hasStoreCreditPayment = payments.some((p) => p.method === 'store_credit');
  const storeCreditBlocked = hasStoreCreditPayment && (!customer || customer.customer_type !== 'loyalty');

  const deliveryFieldsValid = fulfillment === 'pickup' || (
    receiverName.trim() && receiverPhone.trim() && receiverAddress.trim()
  );

  const canCompleteSale =
    cart.length > 0 &&
    payments.length > 0 &&
    payments.every((p) => p.method && parseFloat(p.amount) > 0) &&
    Math.abs(remaining) < 0.5 &&
    !storeCreditBlocked &&
    deliveryFieldsValid &&
    !submitting;

  function getEffectiveFulfillmentType() {
    if (fulfillment === 'pickup') return 'pickup';
    if (deliveryMethod === 'self_delivery') return 'self_delivery';
    return 'courier_delivery';
  }

  function getSelectedCourier() {
    if (fulfillment !== 'delivery' || deliveryMethod === 'self_delivery') return null;
    return couriers.find(c => c.code === deliveryMethod) || null;
  }

  async function completeSale() {
    setError('');
    setSubmitting(true);
    try {
      const effectiveFulfillment = getEffectiveFulfillmentType();
      const courier = getSelectedCourier();

      const payload = {
        channel: 'pos',
        customer_id: customer?.id || null,
        cashier_id: user?.id || null,
        items: cart.map((l) => ({
          variant_id: l.variant_id,
          quantity: l.quantity,
          unit_price: l.unit_price,
          discount_amount: 0,
        })),
        discount_total: promoDiscount + manualDiscount,
        applied_promotions: appliedPromos,
        coupon_code: couponApplied || null,
        payments: payments.map((p) => ({
          payment_method: p.method,
          amount: parseFloat(p.amount),
        })),
        fulfillment_type: effectiveFulfillment,
        delivery_fee: effectiveDeliveryFee,
        delivery_zone_id: selectedZone || null,
        delivery_address: receiverAddress || null,
        notes: deliveryNotes || null,
      };

      if (fulfillment === 'delivery') {
        payload.delivery = {
          courier_id: courier?.id || null,
          tracking_number: trackingNumber || null,
          receiver_name: receiverName || null,
          receiver_phone: receiverPhone || null,
          receiver_address: receiverAddress || null,
        };
      }

      const res = await client.post('/orders/checkout', payload);
      const orderData = res.data.data;
      setSuccessOrder(orderData);
      setReceiptOrderId(orderData.orderId);
      setCart([]);
      setPayments([]);
      clearCustomer();
      resetDelivery();
      setAppliedPromos([]); setPromoDiscount(0); setFreeDelivery(false);
      setCouponApplied(null); setCouponCode(''); setCouponError('');
      setManualDiscountValue('');
      loadProducts();
      loadBestSellers();
      toast.success(`Sale complete — ${orderData.order_number}`);
    } catch (err) {
      setError(err.response?.data?.message ?? 'Checkout failed');
      toast.error('Checkout failed');
    } finally {
      setSubmitting(false);
    }
  }

  function resetDelivery() {
    setFulfillment('pickup');
    setDeliveryMethod('self_delivery');
    setSelectedZone('');
    setDeliveryFee(0);
    setReceiverName('');
    setReceiverPhone('');
    setReceiverAddress('');
    setDeliveryNotes('');
    setTrackingNumber('');
  }

  const totalQty = useMemo(() => cart.reduce((s, l) => s + l.quantity, 0), [cart]);
  const [deliveryBreakdown, setDeliveryBreakdown] = useState(null);

  useEffect(() => {
    if (fulfillment === 'delivery' && deliveryMethod === 'self_delivery' && totalQty > 0) {
      client.get(`/delivery/calculate-fee?zone_id=${zones[0]?.id || ''}&total_packs=${totalQty}`)
        .then(r => {
          setDeliveryFee(Number(r.data.data.total_fee) || 0);
          setDeliveryBreakdown(r.data.data);
        })
        .catch(() => {});
    }
  }, [fulfillment, deliveryMethod, totalQty, zones]);

  function handleFulfillmentChange(f) {
    setFulfillment(f);
    if (f === 'pickup') {
      setSelectedZone('');
      setDeliveryFee(0);
      setDeliveryBreakdown(null);
    }
  }

  const selectedCourier = getSelectedCourier();
  const ic = 'w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-brand-500';

  useKeyboardShortcuts([
    { key: 'F1', action: () => setShowShortcuts(v => !v), allowInInput: true },
    { key: 'F2', action: () => { setCart([]); setSearch(''); clearCustomer(); resetDelivery(); setAppliedPromos([]); setPromoDiscount(0); setFreeDelivery(false); setCouponApplied(null); setCouponCode(''); setPayments([]); setSuccessOrder(null); setManualDiscountValue(''); setReturnMode(false); setReturnOrder(null); setReturnSelections([]); setReturnItems([]); setReturnResult(null); searchRef.current?.focus(); toast.info('New sale'); }, allowInInput: true },
    { key: 'F3', action: () => phoneRef.current?.focus(), allowInInput: true },
    { key: 'F4', action: () => { setScanMessage(null); setScannerOpen(true); }, allowInInput: true },
    { key: 'Escape', action: () => { if (showShortcuts) setShowShortcuts(false); else if (scannerOpen) setScannerOpen(false); else if (receiptOrderId) setReceiptOrderId(null); else if (successOrder) setSuccessOrder(null); }, allowInInput: true },
    { key: 'Enter', ctrl: true, action: () => { if (canCompleteSale) completeSale(); }, allowInInput: true },
    { key: 'k', ctrl: true, action: () => { searchRef.current?.focus(); searchRef.current?.select(); }, allowInInput: true },
    { key: 'd', ctrl: true, action: () => handleFulfillmentChange(fulfillment === 'pickup' ? 'delivery' : 'pickup'), allowInInput: true },
    { key: '?', action: () => setShowShortcuts(v => !v) },
  ], [showShortcuts, scannerOpen, receiptOrderId, successOrder, canCompleteSale, fulfillment]);

  return (
    <PageWrapper className="flex h-full flex-col bg-slate-50 dark:bg-slate-950">
      <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
        {/* Left: product search + grid */}
        <div className="flex flex-1 flex-col overflow-hidden border-b border-slate-200 dark:border-slate-800 md:w-2/3 md:border-b-0 md:border-r">
          <div className="border-b border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900 md:p-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <input
                  ref={searchRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, SKU, or barcode... (Ctrl+K)"
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-brand-500 dark:focus:ring-brand-900/40"
                  autoFocus
                />
              </div>
              <button
                onClick={() => { setScanMessage(null); setScannerOpen(true); }}
                className="flex shrink-0 items-center gap-2 rounded-xl bg-brand-600 px-3.5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700 active:scale-[0.97]"
              >
                <ScanIcon />
                <span className="hidden sm:inline">Scan</span>
              </button>
              <button
                onClick={() => { setReturnModalOpen(true); setReturnSearch(''); setReturnSearchResults([]); setReturnOrder(null); }}
                className="flex shrink-0 items-center gap-2 rounded-xl bg-amber-500 px-3.5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-amber-600 active:scale-[0.97]"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                <span className="hidden sm:inline">Return</span>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 md:p-4">
            {allTags.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-1.5">
                <button onClick={() => setTagFilter('')}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${!tagFilter ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'}`}>
                  All
                </button>
                {allTags.map(t => (
                  <button key={t} onClick={() => setTagFilter(tagFilter === t ? '' : t)}
                    className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${tagFilter === t ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'}`}>
                    {t}
                  </button>
                ))}
              </div>
            )}
            {!search && !tagFilter && bestSellers.length > 0 && (
              <div className="mb-5">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Best sellers (7 days)
                </h3>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
                  {bestSellers.map((p) => (
                    <ProductTile
                      key={p.variant_id}
                      name={p.product_name}
                      label={p.variant_label}
                      price={p.retail_price}
                      stock={p.current_stock}
                      onClick={() => addToCart(p)}
                    />
                  ))}
                </div>
              </div>
            )}

            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              {search ? `Results for "${search}"` : 'All products'}
            </h3>
            {loadingProducts ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
                {[1,2,3,4,5,6].map(i => (
                  <div key={i} className="h-28 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <EmptyState icon="🔍" title="No products found" description={search ? 'Try a different search term' : 'Add products in Inventory'} />
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
                {filteredProducts.map((p) => (
                  <ProductTile
                    key={p.variant_id}
                    name={p.name}
                    label={p.variant_label}
                    price={p.retail_price}
                    stock={p.current_stock}
                    onClick={() => addToCart(p)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: cart + customer + payment + fulfillment */}
        <div className="flex flex-col overflow-hidden bg-white dark:bg-slate-900 md:w-1/3">
          <div className="flex-1 overflow-y-auto p-3 md:p-4">
            {/* Customer */}
            <section className="mb-5">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Customer</h3>
              {customer ? (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-brand-100 bg-brand-50 p-3 text-sm dark:border-brand-900/40 dark:bg-brand-900/10">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">
                        {customer.full_name || 'Unnamed'} · {customer.phone}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        {customer.customer_type === 'loyalty' ? 'Loyalty member' : 'Walk-in (registered)'} ·{' '}
                        {customer.loyalty_points_balance} pts
                        {Number(customer.credit_balance) !== 0 && <> · <span className="font-medium text-red-600 dark:text-red-400">Owes <span className="font-mono">{money(Math.abs(customer.credit_balance))}</span></span></>}
                      </p>
                    </div>
                    <button onClick={clearCustomer} className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">Clear</button>
                  </div>
                  {Number(customer.credit_balance) !== 0 && (
                    <div className="mt-2 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 dark:bg-red-900/20">
                      <span className="text-xs font-medium text-red-700 dark:text-red-400">⚠️ This customer owes {money(Math.abs(customer.credit_balance))}</span>
                    </div>
                  )}
                </motion.div>
              ) : (
                <div>
                  <div className="flex gap-2">
                    <input
                      ref={phoneRef}
                      type="text"
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && lookupCustomer()}
                      placeholder="Phone number (F3)"
                      className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-brand-500"
                    />
                    <button onClick={lookupCustomer}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                      Find
                    </button>
                  </div>
                  <AnimatePresence>
                    {customerSearchState === 'not_found' && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                        className="mt-2 overflow-hidden rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-900/40 dark:bg-amber-900/10">
                        <p className="mb-2 text-amber-800 dark:text-amber-400">No customer found for this number.</p>
                        <input type="text" value={newCustomerName} onChange={(e) => setNewCustomerName(e.target.value)}
                          placeholder="Name (optional)"
                          className="mb-2 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm outline-none focus:border-brand-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white" />
                        <label className="mb-2 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                          <input type="checkbox" checked={registerAsLoyalty} onChange={(e) => setRegisterAsLoyalty(e.target.checked)} className="rounded" />
                          Register as loyalty member
                        </label>
                        <button onClick={createCustomer}
                          className="w-full rounded-lg bg-brand-600 py-1.5 text-sm font-medium text-white hover:bg-brand-700 active:scale-[0.98]">
                          Save customer
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <p className="mt-1.5 text-xs text-slate-400">Leave blank for anonymous walk-in.</p>
                </div>
              )}
            </section>

            {/* Return mode banner */}
            {returnMode && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                className="mb-3 flex items-center justify-between rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5 dark:border-amber-700 dark:bg-amber-900/20">
                <div>
                  <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Return / Exchange Mode</p>
                  <p className="text-xs text-amber-600 dark:text-amber-400">Order: {returnOrder?.order_number}</p>
                </div>
                <button onClick={cancelReturnMode} className="rounded-lg bg-amber-200 px-2.5 py-1 text-xs font-medium text-amber-800 hover:bg-amber-300 dark:bg-amber-800 dark:text-amber-200 dark:hover:bg-amber-700">Cancel</button>
              </motion.div>
            )}

            {/* Cart */}
            <section className="mb-5">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Cart ({cart.length})
              </h3>
              {cart.length === 0 ? (
                <EmptyState icon="🛒" title="Cart is empty" description="Click a product or scan a barcode to add items" />
              ) : (
                <div className="space-y-2">
                  <AnimatePresence initial={false}>
                    {cart.map((l) => (
                      <motion.div
                        key={l.variant_id}
                        layout
                        initial={{ opacity: 0, x: -16 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                        transition={{ duration: 0.2 }}
                        className={`flex items-center gap-2 rounded-xl border p-2.5 ${l.isReturn ? 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-900/20' : 'border-slate-200 dark:border-slate-700'}`}
                      >
                        <div className="min-w-0 flex-1">
                          {l.isReturn && <span className="text-[10px] font-bold uppercase text-red-500">Return</span>}
                          <p className={`truncate text-sm font-medium ${l.isReturn ? 'text-red-700 dark:text-red-400' : 'text-slate-900 dark:text-white'}`}>{l.product_name}</p>
                          <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                            {l.variant_label}
                            {l.active_tier && <span className="ml-1 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">{l.active_tier.label || `${l.active_tier.min_quantity}pk tier`}</span>}
                            {' '}·{' '}
                            {isOwner && !l.isReturn ? (
                              <input type="number" value={l.unit_price} step="0.01" min="0"
                                onChange={(e) => updateUnitPrice(l.variant_id, parseFloat(e.target.value) || 0)}
                                className="inline-block w-20 rounded border border-transparent bg-transparent px-0.5 font-mono text-xs text-slate-500 outline-none transition hover:border-slate-300 focus:border-brand-400 dark:text-slate-400 dark:hover:border-slate-600" />
                            ) : (
                              <span className="font-mono">{money(l.unit_price)}</span>
                            )}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => updateQty(l.variant_id, l.quantity - 1)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 active:scale-95 dark:border-slate-700 dark:hover:bg-slate-800">
                            −
                          </button>
                          <input type="number" value={l.quantity} min="1" max={l.max_stock}
                            onChange={(e) => updateQty(l.variant_id, parseInt(e.target.value) || 0)}
                            className="w-10 rounded-lg border border-slate-200 bg-transparent text-center text-sm font-medium outline-none transition focus:border-brand-400 dark:border-slate-700 dark:text-white" />
                          <button onClick={() => updateQty(l.variant_id, l.quantity + 1)}
                            disabled={l.quantity >= l.max_stock}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 active:scale-95 disabled:opacity-30 dark:border-slate-700 dark:hover:bg-slate-800">
                            +
                          </button>
                        </div>
                        <p className={`w-20 shrink-0 text-right font-mono text-sm font-medium ${l.isReturn ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-white'}`}>
                          {l.isReturn ? `−${money(l.unit_price * l.quantity)}` : money(l.unit_price * l.quantity)}
                        </p>
                        <button onClick={() => removeLine(l.variant_id)} className="rounded-lg p-1 text-slate-300 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </section>

            {/* Payments */}
            {cart.length > 0 && (
              <section className="mb-5">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Payment</h3>
                <div className="mb-3 flex gap-2">
                  <button onClick={setFullCash}
                    className={`flex min-h-[36px] items-center gap-1.5 rounded-lg border-2 px-3 py-1.5 text-xs font-medium transition-all duration-200 active:scale-[0.96] ${
                      !splitMode && payments.length === 1 && payments[0].method === 'cash'
                        ? 'border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-400 dark:bg-brand-900/20 dark:text-brand-300'
                        : 'border-slate-200 text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:text-slate-400 dark:hover:border-slate-600'
                    }`}>
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="2" /><path d="M6 12h.01M18 12h.01" />
                    </svg>
                    Full cash
                  </button>
                  <button onClick={enableSplit}
                    className={`flex min-h-[36px] items-center gap-1.5 rounded-lg border-2 px-3 py-1.5 text-xs font-medium transition-all duration-200 active:scale-[0.96] ${
                      splitMode
                        ? 'border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-400 dark:bg-brand-900/20 dark:text-brand-300'
                        : 'border-slate-200 text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:text-slate-400 dark:hover:border-slate-600'
                    }`}>
                    {splitMode ? (
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    )}
                    Split
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {PAYMENT_METHODS.map((m) => {
                    const isSelected = payments.some((p) => p.method === m.value);
                    return (
                      <motion.button
                        key={m.value}
                        type="button"
                        whileTap={{ scale: 0.96 }}
                        onClick={() => togglePaymentMethod(m.value)}
                        className={`flex min-h-[48px] items-center gap-2.5 rounded-xl border-2 px-3 py-2.5 text-left transition-all duration-200 ${
                          isSelected
                            ? 'border-brand-500 bg-brand-50 dark:border-brand-400 dark:bg-brand-900/20'
                            : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600'
                        }`}
                      >
                        <PaymentIcon type={m.icon} selected={isSelected} />
                        <span className={`text-sm font-medium transition-colors ${
                          isSelected
                            ? 'text-brand-700 dark:text-brand-300'
                            : 'text-slate-600 dark:text-slate-400'
                        }`}>{m.label}</span>
                      </motion.button>
                    );
                  })}
                </div>
                <AnimatePresence>
                  {payments.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3 space-y-2 overflow-hidden"
                    >
                      {payments.map((p) => {
                        const label = PAYMENT_METHODS.find((m) => m.value === p.method)?.label || p.method;
                        return (
                          <div key={p.method} className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/50">
                            <span className="flex-1 text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
                            <input
                              type="number"
                              value={p.amount}
                              onChange={(e) => updatePaymentAmount(p.method, e.target.value)}
                              placeholder="0.00"
                              className="w-28 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-right font-mono text-sm outline-none transition focus:border-brand-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                            />
                          </div>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
                {payments.length === 0 && <p className="mt-2 text-sm text-slate-400">Tap a payment method to continue.</p>}
                {storeCreditBlocked && (
                  <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                    Only loyalty customers can buy on credit.
                  </p>
                )}
                {hasStoreCreditPayment && !storeCreditBlocked && Number(customer?.credit_balance) !== 0 && (() => {
                  const creditAmt = payments.filter(p => p.method === 'store_credit').reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
                  const newBalance = Math.abs(Number(customer.credit_balance)) + creditAmt;
                  return (
                    <div className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                      Adding {money(creditAmt)} to existing credit of {money(Math.abs(customer.credit_balance))}. New balance will be {money(newBalance)}.
                    </div>
                  );
                })()}
              </section>
            )}

            {/* Promotions */}
            {cart.length > 0 && (
              <section className="mb-5">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Promotions</h3>
                {appliedPromos.filter(p => p.promo_type !== 'coupon_code').length > 0 && (
                  <div className="mb-3 space-y-1.5">
                    {appliedPromos.filter(p => p.promo_type !== 'coupon_code').map(p => (
                      <div key={p.id} className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2 dark:bg-emerald-900/10">
                        <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                          {p.promo_type === 'buy_x_get_y' ? '🎁' : p.promo_type === 'free_delivery' ? '🚚' : '🏷️'}{' '}
                          {p.title}
                        </span>
                        {p.discount > 0 && (
                          <span className="font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                            −{money(p.discount)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {couponApplied ? (
                  <div className="flex items-center justify-between rounded-lg bg-brand-50 px-3 py-2 dark:bg-brand-900/10">
                    <span className="text-xs font-medium text-brand-700 dark:text-brand-400">
                      🎟️ <span className="font-mono">{couponApplied}</span> applied
                    </span>
                    <button onClick={removeCoupon} className="text-xs text-slate-400 hover:text-red-500">Remove</button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input type="text" value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())}
                      onKeyDown={e => e.key === 'Enter' && applyCoupon()}
                      placeholder="Coupon code" className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-mono uppercase outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                    <button onClick={applyCoupon} disabled={couponLoading || !couponCode.trim()}
                      className="rounded-xl bg-brand-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-brand-700 disabled:opacity-40">
                      {couponLoading ? '...' : 'Apply'}
                    </button>
                  </div>
                )}
                {couponError && <p className="mt-1 text-xs text-red-500">{couponError}</p>}
              </section>
            )}

            {/* Fulfillment */}
            {cart.length > 0 && (
              <section className="mb-5">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Fulfillment</h3>
                <div className="grid grid-cols-2 gap-2">
                  <motion.button whileTap={{ scale: 0.96 }} onClick={() => handleFulfillmentChange('pickup')}
                    className={`flex items-center gap-2 rounded-xl border-2 px-3 py-3 text-left transition-all ${
                      fulfillment === 'pickup' ? 'border-brand-500 bg-brand-50 dark:border-brand-400 dark:bg-brand-900/20' : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800'
                    }`}>
                    <span className="text-lg">🏪</span>
                    <div>
                      <p className={`text-sm font-medium ${fulfillment === 'pickup' ? 'text-brand-700 dark:text-brand-300' : 'text-slate-600 dark:text-slate-400'}`}>Pickup</p>
                      <p className="text-[10px] text-slate-400">Customer collects</p>
                    </div>
                  </motion.button>
                  <motion.button whileTap={{ scale: 0.96 }} onClick={() => handleFulfillmentChange('delivery')}
                    className={`flex items-center gap-2 rounded-xl border-2 px-3 py-3 text-left transition-all ${
                      fulfillment === 'delivery' ? 'border-brand-500 bg-brand-50 dark:border-brand-400 dark:bg-brand-900/20' : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800'
                    }`}>
                    <span className="text-lg">🚚</span>
                    <div>
                      <p className={`text-sm font-medium ${fulfillment === 'delivery' ? 'text-brand-700 dark:text-brand-300' : 'text-slate-600 dark:text-slate-400'}`}>Delivery</p>
                      <p className="text-[10px] text-slate-400">Ship to customer</p>
                    </div>
                  </motion.button>
                </div>

                <AnimatePresence>
                  {fulfillment === 'delivery' && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                      className="mt-3 space-y-3 overflow-hidden">
                      {/* Delivery method sub-options */}
                      <div className="flex flex-wrap gap-1.5">
                        <button onClick={() => setDeliveryMethod('self_delivery')}
                          className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${deliveryMethod === 'self_delivery'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'}`}>
                          🏠 Our Delivery
                        </button>
                        {couriers.map(c => (
                          <button key={c.code} onClick={() => setDeliveryMethod(c.code)}
                            className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${deliveryMethod === c.code
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                              : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'}`}>
                            📦 {c.name}
                          </button>
                        ))}
                      </div>

                      {/* Zone selector for courier deliveries */}
                      {deliveryMethod !== 'self_delivery' && zones.length > 0 && (
                        <select value={selectedZone} onChange={e => handleZoneChange(e.target.value)} className={ic}>
                          <option value="">Select delivery zone...</option>
                          {zones.map(z => <option key={z.id} value={z.id}>{z.zone_name} ({money(z.base_fee)})</option>)}
                        </select>
                      )}

                      {/* Editable delivery fee for ALL methods */}
                      <div className="rounded-xl bg-brand-50 px-3 py-2.5 dark:bg-brand-900/10">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">Delivery Fee</span>
                          <input type="number" value={deliveryFee || ''} onChange={e => setDeliveryFee(Number(e.target.value) || 0)}
                            placeholder="0.00" min="0" step="50"
                            className="w-28 ml-auto rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-right font-mono text-sm outline-none transition focus:border-brand-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white" />
                        </div>
                        {deliveryMethod === 'self_delivery' && deliveryBreakdown && totalQty > 0 && (
                          <p className="mt-1 text-[10px] text-slate-400">
                            Suggested: Base {money(deliveryBreakdown.base_fee)} (1st pack){totalQty > 1 ? ` + ${totalQty - 1} × ${money(deliveryBreakdown.per_additional_pack_fee)}` : ''} · {totalQty} pack{totalQty > 1 ? 's' : ''}
                          </p>
                        )}
                      </div>

                      {/* Receiver fields */}
                      <input type="text" placeholder="Receiver name *" value={receiverName} onChange={e => setReceiverName(e.target.value)} className={ic} />
                      <input type="text" placeholder="Receiver phone *" value={receiverPhone} onChange={e => setReceiverPhone(e.target.value)} className={ic} />
                      <input type="text" placeholder="Delivery address *" value={receiverAddress} onChange={e => setReceiverAddress(e.target.value)} className={ic} />
                      <input type="text" placeholder="Delivery notes (optional)" value={deliveryNotes} onChange={e => setDeliveryNotes(e.target.value)} className={ic} />

                      {/* Tracking number for couriers */}
                      {deliveryMethod !== 'self_delivery' && (
                        <div className="flex gap-2">
                          <input type="text" placeholder="Tracking # (optional)" value={trackingNumber} onChange={e => setTrackingNumber(e.target.value)}
                            className={`${ic} flex-1 font-mono`} />
                          {trackingNumber && selectedCourier?.tracking_url_template && (
                            <a href={selectedCourier.tracking_url_template.replace('{tracking_number}', trackingNumber)}
                              target="_blank" rel="noopener noreferrer"
                              className="flex items-center rounded-xl bg-blue-600 px-3 text-xs font-medium text-white hover:bg-blue-700">
                              Track
                            </a>
                          )}
                          {trackingNumber && selectedCourier && !selectedCourier.tracking_url_template && (
                            <span className="flex items-center text-[10px] text-slate-400">API pending</span>
                          )}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </section>
            )}
          </div>

          {/* Totals + submit */}
          <div className="border-t border-slate-200 p-3 dark:border-slate-800 md:p-4">
            {isOwner && cart.length > 0 && (
              <div className="mb-2 flex items-center gap-2">
                <select value={manualDiscountType} onChange={(e) => setManualDiscountType(e.target.value)}
                  className="rounded-lg border border-slate-200 px-2 py-1 text-xs outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                  <option value="fixed">Rs.</option>
                  <option value="percentage">%</option>
                </select>
                <input type="number" min="0" step="0.01" value={manualDiscountValue}
                  onChange={(e) => setManualDiscountValue(e.target.value)}
                  placeholder="Manual discount"
                  className="w-28 rounded-lg border border-slate-200 px-2 py-1 text-right font-mono text-xs outline-none transition focus:border-brand-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                {manualDiscount > 0 && <span className="text-xs font-medium text-red-500">−{money(manualDiscount)}</span>}
              </div>
            )}
            {returnMode && returnTotal > 0 && (
              <div className="mb-1 flex justify-between text-sm text-red-500">
                <span>Return value</span>
                <span className="font-mono">−{money(returnTotal)}</span>
              </div>
            )}
            {returnMode && newItemsTotal > 0 && (
              <div className="mb-1 flex justify-between text-sm text-slate-500 dark:text-slate-400">
                <span>New items</span>
                <span className="font-mono">{money(newItemsTotal)}</span>
              </div>
            )}
            {!returnMode && (
            <div className="mb-1 flex justify-between text-sm text-slate-500 dark:text-slate-400">
              <span>Subtotal</span>
              <span className="font-mono">{money(subtotal)}</span>
            </div>
            )}
            {promoDiscount > 0 && (
              <div className="mb-1 flex justify-between text-sm text-emerald-600 dark:text-emerald-400">
                <span>Promotions</span>
                <span className="font-mono">−{money(promoDiscount)}</span>
              </div>
            )}
            {manualDiscount > 0 && (
              <div className="mb-1 flex justify-between text-sm text-red-500">
                <span>Manual discount</span>
                <span className="font-mono">−{money(manualDiscount)}</span>
              </div>
            )}
            {effectiveDeliveryFee > 0 && (
              <div className="mb-1 flex justify-between text-sm text-slate-500 dark:text-slate-400">
                <span>Delivery</span>
                <span className="font-mono">{money(effectiveDeliveryFee)}</span>
              </div>
            )}
            {freeDelivery && deliveryFee > 0 && (
              <div className="mb-1 flex justify-between text-sm text-emerald-600 dark:text-emerald-400">
                <span>🚚 Free Delivery</span>
                <span className="font-mono line-through">{money(deliveryFee)}</span>
              </div>
            )}
            <div className="mb-1 flex justify-between text-base font-semibold text-slate-900 dark:text-white">
              <span>Total</span>
              <span className="font-mono">{money(grandTotal)}</span>
            </div>
            <div className="mb-3 flex justify-between text-xs text-slate-400">
              <span>Remaining</span>
              <span className={`font-mono ${Math.abs(remaining) < 0.5 ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>{money(remaining)}</span>
            </div>

            {error && <div className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">{error}</div>}
            {successOrder && (
              <div className="mb-3 flex items-center justify-between rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
                <span>Sale complete — <span className="font-mono">{successOrder.order_number}</span></span>
                <button onClick={() => setReceiptOrderId(successOrder.orderId)}
                  className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-700 active:scale-[0.97]">
                  Receipt
                </button>
              </div>
            )}

            {returnMode ? (
              <>
                {netTotal < 0 && (
                  <div className="mb-3">
                    <p className="mb-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">Refund method</p>
                    <div className="flex gap-2">
                      <button onClick={() => setReturnRefundMethod('cash')}
                        className={`flex-1 rounded-lg border-2 px-3 py-2 text-xs font-medium transition ${returnRefundMethod === 'cash' ? 'border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-400 dark:bg-brand-900/20 dark:text-brand-300' : 'border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-400'}`}>
                        Cash Refund
                      </button>
                      <button onClick={() => setReturnRefundMethod('store_credit')}
                        className={`flex-1 rounded-lg border-2 px-3 py-2 text-xs font-medium transition ${returnRefundMethod === 'store_credit' ? 'border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-400 dark:bg-brand-900/20 dark:text-brand-300' : 'border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-400'}`}>
                        Reduce Credit
                      </button>
                    </div>
                  </div>
                )}
                <button onClick={processReturn} disabled={returnProcessing || cart.filter(l => l.isReturn).length === 0}
                  className="w-full rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 py-3 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none">
                  {returnProcessing ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                      Processing...
                    </span>
                  ) : netTotal < 0 ? `Process Return — Refund ${money(Math.abs(netTotal))}` : netTotal > 0 ? `Complete Exchange — Pay ${money(netTotal)}` : 'Process Even Exchange'}
                </button>
              </>
            ) : (
            <button onClick={completeSale} disabled={!canCompleteSale}
              className="w-full rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 py-3 text-sm font-semibold text-white shadow-md shadow-brand-500/20 transition-all duration-200 hover:shadow-lg hover:shadow-brand-500/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none">
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  Processing...
                </span>
              ) : 'Complete sale'}
            </button>
            )}
          </div>
        </div>
      </div>

      {/* Return order lookup modal */}
      <AnimatePresence>
        {returnModalOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm" onClick={() => setReturnModalOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 z-[201] w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900 max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Return / Exchange</h2>
                <button onClick={() => setReturnModalOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </div>

              {!returnOrder ? (
                <>
                  <div className="flex gap-2 mb-3">
                    <input type="text" value={returnSearch} onChange={e => setReturnSearch(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && searchReturnOrders()}
                      placeholder="Search by order number or phone..."
                      className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white" autoFocus />
                    <button onClick={searchReturnOrders} disabled={returnSearching}
                      className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50">
                      {returnSearching ? '...' : 'Search'}
                    </button>
                  </div>
                  {returnSearchResults.length > 0 ? (
                    <div className="space-y-2">
                      {returnSearchResults.map(o => (
                        <button key={o.id} onClick={() => selectReturnOrder(o)}
                          className="w-full rounded-xl border border-slate-200 p-3 text-left transition hover:border-brand-300 hover:bg-brand-50 dark:border-slate-700 dark:hover:border-brand-600 dark:hover:bg-brand-900/10">
                          <div className="flex justify-between">
                            <span className="font-mono text-sm font-semibold text-slate-900 dark:text-white">{o.order_number}</span>
                            <span className="font-mono text-sm text-slate-600 dark:text-slate-300">{money(o.grand_total)}</span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {o.customer_name || 'Walk-in'} {o.customer_phone ? `· ${o.customer_phone}` : ''} · {new Date(o.created_at).toLocaleDateString()} · <span className="capitalize">{o.status}</span>
                          </p>
                        </button>
                      ))}
                    </div>
                  ) : returnSearch && !returnSearching ? (
                    <p className="text-sm text-slate-400 text-center py-6">No orders found</p>
                  ) : (
                    <p className="text-sm text-slate-400 text-center py-6">Enter an order number or customer phone to find the order</p>
                  )}
                </>
              ) : (
                <>
                  <div className="mb-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
                    <div className="flex justify-between">
                      <span className="font-mono text-sm font-semibold text-slate-900 dark:text-white">{returnOrder.order_number}</span>
                      <button onClick={() => { setReturnOrder(null); setReturnItems([]); setReturnSelections([]); }}
                        className="text-xs text-brand-600 hover:text-brand-700 dark:text-brand-400">Change order</button>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {returnOrder.customer_name || 'Walk-in'} · {money(returnOrder.grand_total)} · {new Date(returnOrder.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Select items to return</h3>
                  <div className="space-y-2 mb-4">
                    {returnItems.map(item => {
                      const sel = returnSelections.find(s => s.order_item_id === item.order_item_id);
                      const isSelected = !!sel;
                      return (
                        <div key={item.order_item_id}
                          className={`rounded-xl border p-3 transition ${item.returnable <= 0 ? 'opacity-40 border-slate-100 dark:border-slate-800' : isSelected ? 'border-amber-400 bg-amber-50 dark:border-amber-600 dark:bg-amber-900/20' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'}`}>
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-sm font-medium text-slate-900 dark:text-white">{item.product_name}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">{item.variant_label} · {money(item.line_total / item.quantity)} each</p>
                              <p className="text-xs text-slate-400 mt-0.5">
                                Ordered: {item.quantity} · Returned: {item.already_returned} · Returnable: {item.returnable}
                              </p>
                            </div>
                            {item.returnable > 0 && (
                              <div className="flex items-center gap-2">
                                <input type="number" min="0" max={item.returnable} value={sel?.quantity || 0}
                                  onChange={e => toggleReturnSelection(item, parseInt(e.target.value) || 0)}
                                  className="w-14 rounded-lg border border-slate-300 px-2 py-1 text-center text-sm outline-none focus:border-brand-400 dark:border-slate-600 dark:bg-slate-800 dark:text-white" />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {returnSelections.length > 0 && (
                    <div className="border-t border-slate-200 dark:border-slate-700 pt-3 mb-3">
                      <div className="flex justify-between text-sm font-medium">
                        <span className="text-slate-600 dark:text-slate-300">Return total</span>
                        <span className="font-mono text-red-600 dark:text-red-400">
                          {money(returnSelections.reduce((s, r) => s + r.unit_price * r.quantity, 0))}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button onClick={() => setReturnModalOpen(false)}
                      className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                      Cancel
                    </button>
                    <button onClick={confirmReturnSelections} disabled={returnSelections.length === 0}
                      className="flex-1 rounded-xl bg-amber-500 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-40">
                      Add to cart as returns
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {scannerOpen && (
        <BarcodeScanner title="Scan product barcode" hint="Point the camera at a product barcode to add it to the cart."
          onDetected={handleScan} onClose={() => setScannerOpen(false)}>
          {scanMessage && (
            <div className={`mt-3 rounded-xl px-3 py-2 text-sm ${scanMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'}`}>
              {scanMessage.text}
            </div>
          )}
        </BarcodeScanner>
      )}

      {receiptOrderId && <Receipt orderId={receiptOrderId} onClose={() => setReceiptOrderId(null)} />}

      {/* Keyboard shortcuts help */}
      <AnimatePresence>
        {showShortcuts && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm" onClick={() => setShowShortcuts(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 z-[201] w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Keyboard Shortcuts</h2>
                <button onClick={() => setShowShortcuts(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </div>
              <div className="space-y-2">
                {[
                  ['F1', 'Show / hide this help'],
                  ['F2', 'New sale (clear everything)'],
                  ['F3', 'Focus customer phone lookup'],
                  ['F4', 'Open barcode scanner'],
                  ['Esc', 'Close modal / dismiss'],
                  ['Ctrl + Enter', 'Complete sale'],
                  ['Ctrl + K', 'Focus product search'],
                  ['Ctrl + D', 'Toggle pickup / delivery'],
                  ['?', 'Show / hide this help'],
                ].map(([key, desc]) => (
                  <div key={key} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800">
                    <span className="text-sm text-slate-600 dark:text-slate-300">{desc}</span>
                    <kbd className="rounded-md border border-slate-300 bg-white px-2 py-0.5 font-mono text-xs text-slate-700 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200">{key}</kbd>
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </PageWrapper>
  );
}

function PaymentIcon({ type, selected }) {
  const cls = `h-5 w-5 transition-colors ${selected ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400 dark:text-slate-500'}`;
  switch (type) {
    case 'banknote':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="6" width="20" height="12" rx="2" />
          <circle cx="12" cy="12" r="2" />
          <path d="M6 12h.01M18 12h.01" />
        </svg>
      );
    case 'credit-card':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <path d="M2 10h20" />
        </svg>
      );
    case 'landmark':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 22h18M6 18v-4M10 18v-4M14 18v-4M18 18v-4M2 10l10-7 10 7" />
        </svg>
      );
    case 'gift':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="8" width="18" height="4" rx="1" />
          <path d="M12 8v13M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" />
          <path d="M7.5 8a2.5 2.5 0 0 1 0-5C9 3 12 8 12 8M16.5 8a2.5 2.5 0 0 0 0-5C15 3 12 8 12 8" />
        </svg>
      );
    default:
      return null;
  }
}

function ScanIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
      <line x1="7" y1="12" x2="17" y2="12" />
    </svg>
  );
}

function ProductTile({ name, label, price, stock, onClick }) {
  const outOfStock = stock <= 0;
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      disabled={outOfStock}
      className="flex flex-col items-start rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-brand-300 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-brand-600"
    >
      <p className="line-clamp-2 text-sm font-medium text-slate-900 dark:text-white">{name}</p>
      <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <div className="mt-auto flex w-full items-center justify-between">
        <span className="font-mono text-sm font-semibold text-brand-600 dark:text-brand-400">{money(price)}</span>
        <span className={`text-xs ${outOfStock ? 'text-red-500' : stock <= 5 ? 'text-amber-500' : 'text-slate-400'}`}>
          {outOfStock ? 'Out of stock' : `${stock} left`}
        </span>
      </div>
    </motion.button>
  );
}
