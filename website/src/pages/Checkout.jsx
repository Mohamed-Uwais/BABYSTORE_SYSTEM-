import { useEffect, useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, Truck, Store, CreditCard, Loader2, ShieldCheck, Upload, X, CheckCircle2, Image, Tag, Trash2, MapPin, Search } from 'lucide-react';
import api from '../api/client';
import { useCart } from '../context/CartContext';
import { usePromo } from '../context/PromoContext';
import SEO from '../components/SEO';

function formatPrice(amount) {
  return `Rs. ${Number(amount).toLocaleString('en-LK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

async function fetchDeliveryFee(totalPacks, zoneId) {
  if (totalPacks <= 0 || !zoneId) return null;
  try {
    const r = await api.get('/delivery/calculate-fee', { params: { total_packs: totalPacks, zone_id: zoneId } });
    return r.data.data;
  } catch {
    return null;
  }
}

async function fetchDeliveryZones() {
  try {
    const r = await api.get('/delivery/zones');
    return r.data.data || [];
  } catch {
    return [];
  }
}

const STEPS = ['Information', 'Delivery', 'Payment'];

export default function Checkout() {
  const navigate = useNavigate();
  const { items, subtotal, clearCart, itemCount } = useCart();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [paymentSlip, setPaymentSlip] = useState(null);
  const [slipPreview, setSlipPreview] = useState(null);
  const fileInputRef = useRef(null);

  const [couponCode, setCouponCode] = useState('');
  const [couponApplied, setCouponApplied] = useState(null);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponError, setCouponError] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [autoPromos, setAutoPromos] = useState([]);
  const [autoDiscount, setAutoDiscount] = useState(0);
  const [promoFreeDelivery, setPromoFreeDelivery] = useState(false);
  const [couponOpen, setCouponOpen] = useState(false);

  const [zones, setZones] = useState([]);
  const [selectedZoneId, setSelectedZoneId] = useState('');
  const [zoneSearch, setZoneSearch] = useState('');
  const [zoneDropdownOpen, setZoneDropdownOpen] = useState(false);
  const zoneRef = useRef(null);

  const [form, setForm] = useState({
    full_name: '', phone: '', email: '',
    fulfillment_type: 'delivery',
    delivery_address: '',
    notes: '', payment_method: 'cod',
  });

  useEffect(() => {
    if (items.length === 0) navigate('/shop');
  }, [items, navigate]);

  useEffect(() => {
    fetchDeliveryZones().then(setZones);
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (zoneRef.current && !zoneRef.current.contains(e.target)) setZoneDropdownOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedZone = zones.find(z => z.id === Number(selectedZoneId));
  const filteredZones = zones.filter(z => z.zone_name.toLowerCase().includes(zoneSearch.toLowerCase()));

  const totalPacks = items.reduce((s, i) => s + i.qty, 0);
  const [deliveryBreakdown, setDeliveryBreakdown] = useState(null);

  useEffect(() => {
    if (form.fulfillment_type !== 'delivery' || totalPacks <= 0 || !selectedZoneId) {
      setDeliveryBreakdown(null);
      return;
    }
    fetchDeliveryFee(totalPacks, selectedZoneId).then(setDeliveryBreakdown);
  }, [totalPacks, form.fulfillment_type, selectedZoneId]);

  const rawDeliveryFee = form.fulfillment_type === 'delivery' ? (deliveryBreakdown?.total_fee || 0) : 0;
  const deliveryFee = promoFreeDelivery ? 0 : rawDeliveryFee;
  const totalDiscount = autoDiscount + couponDiscount;
  const grandTotal = subtotal - totalDiscount + deliveryFee;

  useEffect(() => {
    if (items.length === 0) return;
    const timer = setTimeout(async () => {
      try {
        const r = await api.post('/promotions/calculate', {
          items: items.map(i => ({ variantId: i.variantId, qty: i.qty, price: i.price })),
          couponCode: couponApplied || undefined,
        });
        const promos = r.data.data.appliedPromotions || [];
        const autos = promos.filter(p => p.promo_type !== 'coupon_code');
        const coupon = promos.find(p => p.promo_type === 'coupon_code');
        setAutoPromos(autos);
        setAutoDiscount(autos.reduce((s, p) => s + (p.discount || 0), 0));
        if (coupon) setCouponDiscount(coupon.discount || 0);
        setPromoFreeDelivery(r.data.data.freeDelivery || false);
      } catch { /* ignore */ }
    }, 300);
    return () => clearTimeout(timer);
  }, [items, couponApplied]);

  async function handleApplyCoupon() {
    if (!couponCode.trim()) return;
    setCouponLoading(true); setCouponError('');
    try {
      const r = await api.post('/promotions/validate', {
        code: couponCode.trim(),
        items: items.map(i => ({ variantId: i.variantId, qty: i.qty, price: i.price })),
      });
      if (!r.data.success) {
        setCouponError(r.data.message);
      } else {
        setCouponApplied(couponCode.trim());
        setCouponDiscount(r.data.data.discount || 0);
        setCouponError('');
      }
    } catch { setCouponError('Failed to validate coupon'); }
    finally { setCouponLoading(false); }
  }

  function handleRemoveCoupon() {
    setCouponApplied(null); setCouponCode(''); setCouponDiscount(0); setCouponError('');
  }

  const updateForm = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSlipChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('File too large. Maximum 5MB allowed.');
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.type)) {
      setError('Only JPEG, PNG, WebP, or PDF files are allowed.');
      return;
    }
    setPaymentSlip(file);
    setSlipPreview(file.type === 'application/pdf' ? 'pdf' : URL.createObjectURL(file));
    setError('');
  };

  const removeSlip = () => {
    setPaymentSlip(null);
    if (slipPreview) URL.revokeObjectURL(slipPreview);
    setSlipPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const canProceed = () => {
    if (step === 0) return form.full_name.trim() && form.phone.trim() && form.phone.length >= 9;
    if (step === 1) {
      if (form.fulfillment_type === 'delivery') return form.delivery_address.trim() && selectedZoneId;
      return true;
    }
    return true;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('full_name', form.full_name.trim());
      formData.append('phone', form.phone.trim());
      if (form.email.trim()) formData.append('email', form.email.trim());
      formData.append('items', JSON.stringify(items.map(i => ({ variantId: i.variantId, qty: i.qty, price: i.price }))));
      formData.append('fulfillment_type', form.fulfillment_type);
      if (form.fulfillment_type === 'delivery') {
        formData.append('delivery_address', form.delivery_address.trim());
        if (selectedZoneId) formData.append('delivery_zone_id', selectedZoneId);
      }
      formData.append('delivery_fee', deliveryFee);
      formData.append('discount_total', totalDiscount);
      if (couponApplied) formData.append('coupon_code', couponApplied);
      formData.append('payment_method', form.payment_method);
      formData.append('payments', JSON.stringify([{ payment_method: form.payment_method, amount: grandTotal }]));
      if (form.notes.trim()) formData.append('notes', form.notes.trim());
      if (paymentSlip) formData.append('payment_slip', paymentSlip);

      const res = await api.post('/checkout', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      clearCart();
      navigate(`/order-confirmation/${res.data.data.order_number}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (items.length === 0) return null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <SEO title="Checkout" path="/checkout" description="Complete your order at Littora Diapers. Secure checkout with cash on delivery or bank transfer." />
      <div className="border-b border-slate-100 bg-white">
        <div className="mx-auto flex max-w-4xl items-center gap-4 px-4 py-4">
          <Link to="/shop" className="flex items-center gap-1 text-sm text-slate-500 hover:text-primary-600">
            <ChevronLeft className="h-4 w-4" /> Continue Shopping
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Step indicators */}
        <div className="mb-8 flex items-center justify-center gap-1">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-1">
              <button
                onClick={() => i < step && setStep(i)}
                disabled={i > step}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  i === step ? 'bg-primary-500 text-white' :
                  i < step ? 'bg-primary-100 text-primary-700 hover:bg-primary-200' :
                  'bg-slate-100 text-slate-400'
                }`}
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-xs">{i + 1}</span>
                {s}
              </button>
              {i < STEPS.length - 1 && <div className="mx-2 h-px w-8 bg-slate-200" />}
            </div>
          ))}
        </div>

        <div className="grid gap-8 lg:grid-cols-5">
          {/* Form area */}
          <div className="lg:col-span-3">
            {step === 0 && (
              <StepCard title="Your Information">
                <InputField label="Full Name *" value={form.full_name} onChange={v => updateForm('full_name', v)} placeholder="e.g. Amara Perera" />
                <InputField label="Phone Number *" value={form.phone} onChange={v => updateForm('phone', v)} placeholder="e.g. 077 123 4567" type="tel" />
                <InputField label="Email (optional)" value={form.email} onChange={v => updateForm('email', v)} placeholder="e.g. amara@email.com" type="email" />
              </StepCard>
            )}

            {step === 1 && (
              <StepCard title="Delivery Method">
                <div className="grid gap-3 sm:grid-cols-2">
                  <FulfillmentOption
                    icon={Truck}
                    label="Home Delivery"
                    desc="Delivered to your address"
                    selected={form.fulfillment_type === 'delivery'}
                    onClick={() => updateForm('fulfillment_type', 'delivery')}
                  />
                  <FulfillmentOption
                    icon={Store}
                    label="Store Pickup"
                    desc="Pick up from our store (Free)"
                    selected={form.fulfillment_type === 'pickup'}
                    onClick={() => updateForm('fulfillment_type', 'pickup')}
                  />
                </div>

                {form.fulfillment_type === 'delivery' && (
                  <div className="mt-6 space-y-4">
                    {/* Zone selector */}
                    <div ref={zoneRef} className="relative">
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">Select Your Area / District *</label>
                      <button
                        type="button"
                        onClick={() => setZoneDropdownOpen(!zoneDropdownOpen)}
                        className={`flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-all ${
                          selectedZone ? 'border-primary-500 bg-primary-50' : 'border-slate-200 bg-white hover:border-primary-300'
                        }`}
                      >
                        <MapPin className={`h-4 w-4 shrink-0 ${selectedZone ? 'text-primary-500' : 'text-slate-400'}`} />
                        <span className={`flex-1 text-sm ${selectedZone ? 'font-medium text-primary-700' : 'text-slate-400'}`}>
                          {selectedZone ? selectedZone.zone_name : 'Choose your delivery area...'}
                        </span>
                        <ChevronLeft className={`h-4 w-4 text-slate-400 transition-transform ${zoneDropdownOpen ? 'rotate-90' : '-rotate-90'}`} />
                      </button>
                      {zoneDropdownOpen && (
                        <div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                          <div className="border-b border-slate-100 p-2">
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                              <input
                                type="text"
                                value={zoneSearch}
                                onChange={e => setZoneSearch(e.target.value)}
                                placeholder="Search area..."
                                autoFocus
                                className="w-full rounded-lg bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none placeholder:text-slate-400 focus:bg-white focus:ring-1 focus:ring-primary-300"
                              />
                            </div>
                          </div>
                          <div className="max-h-48 overflow-y-auto">
                            {filteredZones.length === 0 ? (
                              <p className="px-4 py-3 text-sm text-slate-400">No areas found</p>
                            ) : filteredZones.map(z => (
                              <button
                                key={z.id}
                                type="button"
                                onClick={() => { setSelectedZoneId(String(z.id)); setZoneDropdownOpen(false); setZoneSearch(''); }}
                                className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition-colors hover:bg-primary-50 ${
                                  Number(selectedZoneId) === z.id ? 'bg-primary-50 font-medium text-primary-700' : 'text-slate-700'
                                }`}
                              >
                                <span>{z.zone_name}</span>
                                <span className="text-xs text-slate-400">{formatPrice(z.base_fee)}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Fee breakdown */}
                    {selectedZone && (
                      <div className="rounded-xl bg-primary-50 p-4">
                        <p className="text-sm font-medium text-primary-800">Delivery to: {selectedZone.zone_name}</p>
                        {deliveryBreakdown ? (
                          <>
                            <p className="mt-1 text-xs text-primary-600">
                              Base {formatPrice(deliveryBreakdown.base_fee)} (1st pack)
                              {totalPacks > 1 && ` + ${totalPacks - 1} × ${formatPrice(deliveryBreakdown.per_additional_pack_fee)}`}
                            </p>
                            <p className="mt-2 text-sm font-bold text-primary-900">
                              {totalPacks} {totalPacks === 1 ? 'pack' : 'packs'} = {formatPrice(deliveryBreakdown.total_fee)}
                            </p>
                          </>
                        ) : (
                          <p className="mt-1 text-xs text-primary-600">Calculating...</p>
                        )}
                      </div>
                    )}

                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">Delivery Address *</label>
                      <textarea
                        value={form.delivery_address}
                        onChange={e => updateForm('delivery_address', e.target.value)}
                        placeholder="Street address, city, apartment, floor..."
                        rows={3}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-primary-300 focus:ring-2 focus:ring-primary-100 resize-none"
                      />
                    </div>
                  </div>
                )}

                <div className="mt-6">
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Order Notes (optional)</label>
                  <textarea
                    value={form.notes}
                    onChange={e => updateForm('notes', e.target.value)}
                    placeholder="Special instructions..."
                    rows={2}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-primary-300 focus:ring-2 focus:ring-primary-100 resize-none"
                  />
                </div>
              </StepCard>
            )}

            {step === 2 && (
              <StepCard title="Payment Method">
                <div className="grid gap-3 sm:grid-cols-2">
                  <FulfillmentOption
                    icon={CreditCard}
                    label="Cash on Delivery"
                    desc="Pay when you receive"
                    selected={form.payment_method === 'cod'}
                    onClick={() => { updateForm('payment_method', 'cod'); removeSlip(); }}
                  />
                  <FulfillmentOption
                    icon={CreditCard}
                    label="Bank Transfer"
                    desc="Pay via bank transfer"
                    selected={form.payment_method === 'bank_transfer'}
                    onClick={() => updateForm('payment_method', 'bank_transfer')}
                  />
                </div>

                {form.payment_method === 'bank_transfer' && (
                  <div className="mt-6 space-y-4">
                    <div className="rounded-xl bg-primary-50 p-4 text-sm text-primary-800">
                      <p className="font-semibold">Bank Details:</p>
                      <p className="mt-1">Bank: Commercial Bank</p>
                      <p>Account: 8011889232</p>
                      <p>Name: Mohamed M.U</p>
                    </div>

                    {/* Payment slip upload */}
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">Upload Payment Slip</label>
                      {slipPreview ? (
                        <div className="relative rounded-xl border-2 border-emerald-200 bg-emerald-50 p-3">
                          <div className="flex items-center gap-3">
                            <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white">
                              {slipPreview === 'pdf' ? (
                                <span className="text-3xl">📄</span>
                              ) : (
                                <img src={slipPreview} alt="Payment slip" className="h-full w-full object-cover" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 text-emerald-700">
                                <CheckCircle2 className="h-4 w-4" />
                                <span className="text-sm font-medium">Slip uploaded</span>
                              </div>
                                <p className="mt-0.5 text-xs text-slate-500 truncate">{paymentSlip?.name}</p>
                              <p className="text-xs text-slate-400">{paymentSlip?.size > 1024 * 1024 ? `${(paymentSlip.size / (1024 * 1024)).toFixed(1)} MB` : `${(paymentSlip?.size / 1024).toFixed(0)} KB`}</p>
                            </div>
                            <button
                              onClick={removeSlip}
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm transition-colors hover:bg-red-50 hover:text-red-500"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center transition-colors hover:border-primary-400 hover:bg-primary-50"
                        >
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 text-primary-500">
                            <Upload className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-700">Click to upload payment slip</p>
                            <p className="mt-0.5 text-xs text-slate-400">JPEG, PNG, WebP, or PDF — Max 5MB</p>
                          </div>
                        </button>
                      )}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,application/pdf"
                        onChange={handleSlipChange}
                        className="hidden"
                      />
                    </div>
                  </div>
                )}

                {/* Coupon code section */}
                <div className="mt-6 border-t border-slate-100 pt-4">
                  <button onClick={() => setCouponOpen(!couponOpen)}
                    className="flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700">
                    <Tag className="h-4 w-4" />
                    {couponOpen ? 'Hide coupon' : 'Have a coupon?'}
                  </button>

                  {couponOpen && (
                    <div className="mt-3">
                      {couponApplied ? (
                        <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-3">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            <span className="text-sm font-medium text-emerald-700">
                              <span className="font-mono">{couponApplied}</span> applied — {formatPrice(couponDiscount)} off!
                            </span>
                          </div>
                          <button onClick={handleRemoveCoupon} className="rounded-full p-1 text-slate-400 hover:text-red-500">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={couponCode}
                            onChange={e => setCouponCode(e.target.value.toUpperCase())}
                            onKeyDown={e => e.key === 'Enter' && handleApplyCoupon()}
                            placeholder="Enter coupon code"
                            className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 font-mono text-sm uppercase text-slate-700 outline-none focus:border-primary-300 focus:ring-2 focus:ring-primary-100"
                          />
                          <button
                            onClick={handleApplyCoupon}
                            disabled={couponLoading || !couponCode.trim()}
                            className="rounded-xl bg-primary-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-600 disabled:opacity-50"
                          >
                            {couponLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply'}
                          </button>
                        </div>
                      )}
                      {couponError && <p className="mt-2 text-sm text-red-500">{couponError}</p>}
                    </div>
                  )}
                </div>

                {error && (
                  <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
                )}
              </StepCard>
            )}

            {/* Navigation */}
            <div className="mt-6 flex items-center justify-between">
              {step > 0 ? (
                <button
                  onClick={() => setStep(s => s - 1)}
                  className="flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-primary-600"
                >
                  <ChevronLeft className="h-4 w-4" /> Back
                </button>
              ) : <div />}

              {step < 2 ? (
                <button
                  onClick={() => setStep(s => s + 1)}
                  disabled={!canProceed()}
                  className="rounded-2xl bg-gradient-to-r from-primary-500 to-primary-600 px-8 py-3 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-primary-500 to-primary-600 px-8 py-3 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg disabled:opacity-70"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                  {submitting ? 'Placing Order...' : `Place Order — ${formatPrice(grandTotal)}`}
                </button>
              )}
            </div>
          </div>

          {/* Order summary sidebar */}
          <div className="lg:col-span-2">
            <div className="sticky top-24 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <h3 className="text-base font-bold text-slate-900">Order Summary</h3>
              <div className="mt-4 max-h-64 space-y-3 overflow-y-auto">
                {items.map(item => (
                  <div key={item.key} className="flex items-start gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-50 text-lg">🧷</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{item.name}</p>
                      <p className="text-xs text-slate-400">{item.variantLabel} × {item.qty}</p>
                    </div>
                    <span className="font-mono text-sm font-medium text-slate-700">{formatPrice(item.price * item.qty)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
                <SummaryRow label={`Subtotal (${itemCount} items)`} value={formatPrice(subtotal)} />

                {autoPromos.length > 0 && autoPromos.map(p => (
                  <div key={p.id} className="flex items-center justify-between">
                    <span className="text-xs text-emerald-600">
                      {p.promo_type === 'buy_x_get_y' ? '🎁' : '🏷️'} {p.title}
                    </span>
                    {p.discount > 0 && (
                      <span className="font-mono text-xs font-medium text-emerald-600">−{formatPrice(p.discount)}</span>
                    )}
                  </div>
                ))}

                {couponApplied && couponDiscount > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-emerald-600">🎟️ {couponApplied}</span>
                    <span className="font-mono text-xs font-medium text-emerald-600">−{formatPrice(couponDiscount)}</span>
                  </div>
                )}

                {form.fulfillment_type === 'delivery' && (
                  <div>
                    <SummaryRow label={selectedZone ? `Delivery (${selectedZone.zone_name})` : 'Delivery Fee'} value={promoFreeDelivery ? 'Free 🚚' : (deliveryBreakdown ? formatPrice(deliveryFee) : '—')} />
                    {!promoFreeDelivery && deliveryBreakdown && totalPacks > 1 && (
                      <p className="mt-0.5 text-right text-[10px] text-slate-400">
                        {formatPrice(deliveryBreakdown.base_fee)} + {totalPacks - 1} × {formatPrice(deliveryBreakdown.per_additional_pack_fee)}
                      </p>
                    )}
                  </div>
                )}
                {form.fulfillment_type === 'pickup' && (
                  <SummaryRow label="Pickup" value="Free" />
                )}
                <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                  <span className="text-sm font-bold text-slate-900">Total</span>
                  <span className="font-mono text-lg font-bold text-slate-900">{formatPrice(grandTotal)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function StepCard({ title, children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm"
    >
      <h2 className="mb-5 text-lg font-bold text-slate-900">{title}</h2>
      {children}
    </motion.div>
  );
}

function InputField({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div className="mb-4">
      <label className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition-colors focus:border-primary-300 focus:ring-2 focus:ring-primary-100"
      />
    </div>
  );
}

function FulfillmentOption({ icon: Icon, label, desc, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-all ${
        selected ? 'border-primary-500 bg-primary-50' : 'border-slate-200 hover:border-primary-300'
      }`}
    >
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${selected ? 'bg-primary-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className={`text-sm font-semibold ${selected ? 'text-primary-700' : 'text-slate-700'}`}>{label}</p>
        <p className="text-xs text-slate-400">{desc}</p>
      </div>
    </button>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="font-mono text-sm font-medium text-slate-700">{value}</span>
    </div>
  );
}
