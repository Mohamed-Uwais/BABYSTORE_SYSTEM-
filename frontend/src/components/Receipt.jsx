import { previewReceipt } from './receiptPrint';
import { useEffect, useRef, useState } from 'react';
import client from '../api/client';
import { useToast } from '../context/ToastContext';

function money(n, symbol = 'Rs.') {
  return `${symbol}${Number(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-LK', { year: 'numeric', month: 'short', day: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit' });
}

const PAYMENT_LABELS = {
  cash: 'Cash',
  card: 'Card',
  bank_transfer: 'Bank Transfer',
  store_credit: 'Store Credit',
  pay_later: 'Credit (Pay Later)',
  online_gateway: 'Online',
  cod: 'Cash on Delivery',
};

export default function Receipt({ orderId, onClose, pendingPrint }) {
  const toast = useToast();
  const [order, setOrder] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [logoDataUrl, setLogoDataUrl] = useState(null);
  const receiptRef = useRef(null);

  useEffect(() => {
    Promise.all([
      client.get(`/orders/${orderId}`),
      client.get('/settings'),
    ]).then(([orderRes, settingsRes]) => {
      setOrder(orderRes.data.data);
      const s = settingsRes.data.data;
      setSettings(s);
      if (s?.logo_url) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          setLogoDataUrl(canvas.toDataURL('image/png'));
          setLoading(false);
        };
        img.onerror = () => setLoading(false);
        img.src = s.logo_url;
      } else {
        setLoading(false);
      }
    }).catch(()=>setLoading(false));
  }, [orderId]);

  useEffect(() => {
    if (loading || !order || !receiptRef.current || pendingPrint?.current !== orderId) return;
    pendingPrint.current = null;
    const frame = document.createElement('iframe');
    frame.title = 'Sale receipt print job';
    frame.style.cssText = 'position:fixed;left:-10000px;top:0;width:210mm;height:297mm;border:0';
    document.body.append(frame);
    let disposed = false;
    const win = frame.contentWindow;
    try {
      previewReceipt(receiptRef.current,settings,false,win);
      Promise.all(Array.from(win.document.images,img=>img.decode().catch(()=>{}))).then(()=>{
        if(disposed) return;
        try {win.print()} catch {toast.error('Sale saved. Use Reprint copy to try printing again.')}
      });
    } catch { toast.error('Sale saved. Use Reprint copy to try printing again.') }
    return ()=>{disposed=true;frame.remove()};
  },[loading,order,orderId,settings,pendingPrint]);

  function generateWhatsAppText() {
    if (!order) return '';
    const lines = [];
    lines.push(`*${storeName}*`);
    if (addressParts.length) lines.push(addressParts.join(', '));
    lines.push('');
    lines.push(`Order: ${order.order_number}`);
    lines.push(`Date: ${fmtDate(order.created_at)}`);
    if (order.customer_name) lines.push(`Customer: ${order.customer_name}`);
    lines.push('---');
    order.items.forEach(item => {
      lines.push(`${item.product_name}${item.variant_label ? ' (' + item.variant_label + ')' : ''}`);
      lines.push(`  ${item.quantity} x ${money(item.unit_price, cur)} = ${money(item.line_total, cur)}`);
    });
    lines.push('---');
    lines.push(`Subtotal: ${money(order.subtotal, cur)}`);
    if (Number(order.discount_total) > 0) lines.push(`Discount: -${money(order.discount_total, cur)}`);
    if (Number(order.delivery_fee) > 0) lines.push(`Delivery: ${money(order.delivery_fee, cur)}`);
    lines.push(`*TOTAL: ${money(order.grand_total, cur)}*`);
    lines.push('');
    lines.push('Payment:');
    order.payments.forEach(p => {
      lines.push(`  ${PAYMENT_LABELS[p.payment_method] || p.payment_method}: ${money(p.amount, cur)}`);
    });
    if (settings?.receipt_footer) { lines.push(''); lines.push(settings.receipt_footer); }
    return lines.join('\n');
  }

  const [whatsappBusy, setWhatsappBusy] = useState(false);

  async function handleWhatsApp() {
    if (!receiptRef.current) return;
    setWhatsappBusy(true);
    try {
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(receiptRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.92));
      const file = new File([blob], `receipt-${order.order_number}.jpg`, { type: 'image/jpeg' });

      let phone = order.customer_phone?.replace(/[^0-9]/g, '') || '';
      if (phone && phone.startsWith('0')) phone = '94' + phone.substring(1);
      const waUrl = phone ? `https://wa.me/${phone}` : `https://wa.me/`;

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `Receipt ${order.order_number}` });
      } else {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = file.name;
        link.click();
        URL.revokeObjectURL(link.href);
        window.open(waUrl, '_blank');
        toast.info('Receipt downloaded! Attach it in the WhatsApp chat that just opened.');
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        const text = encodeURIComponent(generateWhatsAppText());
        let phone = order.customer_phone?.replace(/[^0-9]/g, '') || '';
        if (phone && phone.startsWith('0')) phone = '94' + phone.substring(1);
        window.open(phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`, '_blank');
      }
    } finally { setWhatsappBusy(false); }
  }

  function handlePrint(copy = false) {
    if (receiptRef.current && !previewReceipt(receiptRef.current, settings, copy)) toast.error('Allow pop-ups to preview the receipt');
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-slate-900/40" />
        <div className="relative w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-xl">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
          <p className="mt-3 text-sm text-slate-500">Loading receipt…</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
        <div className="relative w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-xl">
          <p className="text-sm text-red-600">Could not load order.</p>
          <button onClick={onClose} className="mt-4 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Close</button>
        </div>
      </div>
    );
  }

  const cashPayments = order.payments.filter(p => p.payment_method === 'cash');
  const cashTendered = cashPayments.reduce((sum,p)=>sum+Number(p.cash_tendered ?? p.amount),0);
  const change = cashPayments.some(p=>p.cash_tendered!=null)
    ? cashTendered - cashPayments.reduce((sum,p)=>sum+Number(p.amount),0)
    : order.payments.length === 1 ? Math.max(0,cashTendered-Number(order.grand_total)) : 0;
  const cur = settings?.currency_symbol || 'Rs.';
  const storeName = settings?.store_name || 'LITTORA';
  const addressParts = [settings?.address_line1, settings?.address_line2, settings?.city].filter(Boolean);
  const logoUrl = settings?.logo_url || null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />

      <div className="relative flex w-full max-w-sm flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">Receipt</h2>
          <button onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-slate-600">✕</button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">
          <div ref={receiptRef} className="receipt-content font-mono text-xs leading-relaxed text-slate-800">
            {/* Logo */}
            {logoUrl && (
              <div className="receipt-logo text-center">
                <img src={logoDataUrl || logoUrl} alt="" className="mx-auto mb-2" style={{ maxWidth: '200px', maxHeight: '60px', objectFit: 'contain', filter: 'grayscale(100%)' }} />
              </div>
            )}

            {/* Store header */}
            <div className="text-center">
              <p className="text-sm font-bold">{storeName}</p>
              {Boolean(settings?.receipt_contact ?? 1) && addressParts.length > 0 && <p>{addressParts.join(', ')}</p>}
              {Boolean(settings?.receipt_contact ?? 1) && settings?.phone && <p>Tel: {settings.phone}</p>}
              {Boolean(settings?.receipt_contact ?? 1) && settings?.email && <p>{settings.email}</p>}
              {settings?.tax_id && <p>Tax ID: {settings.tax_id}</p>}
            </div>

            <div className="my-2 border-t border-dashed border-slate-400" />

            {/* Order info */}
            <div className="flex justify-between">
              <span>Order:</span>
              <span className="font-medium">{order.order_number}</span>
            </div>
            <div className="flex justify-between">
              <span>Date:</span>
              <span>{fmtDate(order.created_at)}</span>
            </div>
            {Boolean(settings?.receipt_cashier ?? 1) && order.cashier_name && (
              <div className="flex justify-between">
                <span>Cashier:</span>
                <span>{order.cashier_name}</span>
              </div>
            )}
            {Boolean(settings?.receipt_customer ?? 1) && order.customer_name && (
              <div className="flex justify-between">
                <span>Customer:</span>
                <span>{order.customer_name}</span>
              </div>
            )}
            {Boolean(settings?.receipt_customer ?? 1) && order.customer_phone && (
              <div className="flex justify-between">
                <span>Phone:</span>
                <span>{order.customer_phone}</span>
              </div>
            )}

            <div className="my-2 border-t border-dashed border-slate-400" />

            {/* Column headers */}
            <div className="flex justify-between font-medium">
              <span className="w-1/4">Item</span>
              <span className="w-1/6 text-center">Qty</span>
              <span className="w-[30%] text-right">Price</span>
              <span className="w-[30%] text-right">Total</span>
            </div>

            <div className="my-1 border-t border-dotted border-slate-300" />

            {/* Line items */}
            {order.items.map((item, i) => (
              <div key={i}>
                <p className="font-medium">{item.product_name} {item.variant_label}</p>
                {item.discount_allocation ? <div>
                  {Object.entries({promotion:'Promotion',coupon:'Coupon',manual:'Manual discount',loyalty:'Loyalty'}).map(([key,label])=>
                    item.discount_allocation[key]>0 && <p key={key}>{label}: {money(item.discount_allocation[key]/100,cur)}</p>)}
                  <p>Line paid: {money(item.refund_paid_amount,cur)}</p>
                </div> : Number(item.discount_amount)>0 && <p>Item discount: {money(item.discount_amount,cur)}</p>}
                <div className="flex justify-between">
                  <span className="w-1/4" />
                  <span className="w-1/6 text-center">{item.quantity}</span>
                  <span className="w-[30%] text-right">{money(item.unit_price, cur)}</span>
                  <span className="w-[30%] text-right">{money(item.line_total, cur)}</span>
                </div>
              </div>
            ))}

            <div className="my-2 border-t border-dashed border-slate-400" />

            {/* Totals */}
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{money(order.subtotal, cur)}</span>
            </div>
            {Number(order.discount_total) > 0 && (
              <div className="flex justify-between text-red-600">
                <span>Discount</span>
                <span>-{money(order.discount_total, cur)}</span>
              </div>
            )}
            {order.receipt_coupon_code && <p>Included coupon {order.receipt_coupon_code}: {money(order.receipt_coupon_amount,cur)}</p>}
            {Number(order.delivery_fee) > 0 && (
              <div className="flex justify-between">
                <span>Delivery</span>
                <span>{money(order.delivery_fee, cur)}</span>
              </div>
            )}
            <div className="my-1 border-t border-dotted border-slate-300" />
            <div className="flex justify-between text-sm font-bold">
              <span>TOTAL</span>
              <span>{money(order.grand_total, cur)}</span>
            </div>

            <div className="my-2 border-t border-dashed border-slate-400" />

            {order.credits?.map((c,i)=><p key={i}>Return on bill #{c.original_order_id}{c.replacement_order_id && <> · Applied to bill #{c.replacement_order_id}: {money(c.applied_amount,cur)}</>}{Number(c.residual_amount)>0 && <> · {c.residual_method} refund {money(c.residual_amount,cur)}</>}</p>)}
            {/* Payments */}
            <p className="font-medium">Payment:</p>
            {order.payments.map((p, i) => (
              <div key={i} className="flex justify-between">
                <span>{PAYMENT_LABELS[p.payment_method] || p.payment_method}</span>
                <span>{money(p.amount, cur)}</span>
              </div>
            ))}

            {order.returns?.map(r => <div key={r.id}><strong>Return</strong> {r.quantity} × {r.product_name} {r.variant_label} · {r.reason} · Refund {money(r.refund_amount, cur)} · {r.restock ? 'Restocked' : 'Kept out of stock'}</div>)}
            {cashTendered > 0 && <div className="flex justify-between"><span>Cash tendered</span><span>{money(cashTendered,cur)}</span></div>}
            {change > 0 && <div className="flex justify-between"><span>Change</span><span>{money(change,cur)}</span></div>}

            {/* Outstanding credit balance */}
            {order.customer_credit_balance != null && Number(order.customer_credit_balance) !== 0 && (() => {
              const bal = Number(order.customer_credit_balance);
              const creditOnSale = order.payments.filter(p => p.payment_method === 'pay_later').reduce((s, p) => s + Number(p.amount), 0);
              if (bal > 0 || creditOnSale > 0) {
                const prevBal = bal - creditOnSale;
                return (
                  <>
                    <div className="my-2 border-t border-dashed border-slate-400" />
                    {prevBal > 0 && (
                      <div className="flex justify-between">
                        <span>Previous Balance</span>
                        <span>{money(prevBal, cur)}</span>
                      </div>
                    )}
                    {creditOnSale > 0 && (
                      <div className="flex justify-between">
                        <span>This Sale (Credit)</span>
                        <span>{money(creditOnSale, cur)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold">
                      <span>TOTAL OUTSTANDING</span>
                      <span>{money(bal, cur)}</span>
                    </div>
                  </>
                );
              }
              if (bal < 0) {
                return (
                  <>
                    <div className="my-2 border-t border-dashed border-slate-400" />
                    <div className="flex justify-between">
                      <span>Store Credit Available</span>
                      <span>{money(Math.abs(bal), cur)}</span>
                    </div>
                  </>
                );
              }
              return null;
            })()}

            <div className="my-2 border-t border-dashed border-slate-400" />

            {/* Footer */}
            {settings?.receipt_footer && (
              <p className="text-center text-slate-500">{settings.receipt_footer}</p>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 border-t border-slate-200 px-5 py-4">
          <button onClick={() => handlePrint(true)} className="rounded border px-2">Reprint copy</button>
          <button onClick={() => handlePrint(false)}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" />
            </svg>
            Print preview
          </button>
          <button onClick={handleWhatsApp} disabled={whatsappBusy}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-green-600 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            {whatsappBusy ? 'Generating...' : 'WhatsApp'}
          </button>
          <button onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
