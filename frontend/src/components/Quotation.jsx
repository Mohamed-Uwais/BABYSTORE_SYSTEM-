import { useEffect, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import client from '../api/client';
import { useToast } from '../context/ToastContext';

function money(n) {
  return `Rs. ${Number(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function Quotation({ quotationId, onClose }) {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [logoDataUrl, setLogoDataUrl] = useState(null);
  const ref = useRef(null);
  const [whatsappBusy, setWhatsappBusy] = useState(false);

  useEffect(() => {
    Promise.all([
      client.get(`/quotations/${quotationId}`),
      client.get('/settings'),
    ]).then(([qRes, sRes]) => {
      setData(qRes.data.data);
      const s = sRes.data.data;
      setSettings(s);
      if (s?.logo_url) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          canvas.getContext('2d').drawImage(img, 0, 0);
          setLogoDataUrl(canvas.toDataURL('image/png'));
          setLoading(false);
        };
        img.onerror = () => setLoading(false);
        img.src = s.logo_url;
      } else {
        setLoading(false);
      }
    });
  }, [quotationId]);

  const storeName = settings?.store_name || 'LITTORA';
  const items = data ? (typeof data.items === 'string' ? JSON.parse(data.items) : data.items) : [];

  function handlePrint() {
    if (!ref.current) return;
    const win = window.open('', '_blank', 'width=600,height=800');
    win.document.write(`<!DOCTYPE html><html><head><title>Quotation</title><style>${printCSS}</style></head><body>`);
    win.document.write(ref.current.innerHTML);
    win.document.write('</body></html>');
    win.document.close();
    win.focus();
    win.print();
    win.close();
  }

  async function handleWhatsApp() {
    if (!ref.current) return;
    setWhatsappBusy(true);
    try {
      const canvas = await html2canvas(ref.current, { backgroundColor: '#ffffff', scale: 2, useCORS: true, logging: false });
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.92));
      const file = new File([blob], `quotation-${data.quotation_number}.jpg`, { type: 'image/jpeg' });
      let phone = data.customer_phone?.replace(/[^0-9]/g, '') || '';
      if (phone && phone.startsWith('0')) phone = '94' + phone.substring(1);
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `Quotation ${data.quotation_number}` });
      } else {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = file.name;
        link.click();
        URL.revokeObjectURL(link.href);
        window.open(phone ? `https://wa.me/${phone}` : 'https://wa.me/', '_blank');
        toast.info('Quotation downloaded! Attach it in WhatsApp.');
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        const text = encodeURIComponent(generateText());
        let phone = data.customer_phone?.replace(/[^0-9]/g, '') || '';
        if (phone && phone.startsWith('0')) phone = '94' + phone.substring(1);
        window.open(phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`, '_blank');
      }
    } finally { setWhatsappBusy(false); }
  }

  function generateText() {
    const lines = [`*${storeName} — QUOTATION*`, '', `Ref: ${data.quotation_number}`, `Date: ${new Date(data.created_at).toLocaleDateString('en-LK')}`, `Valid until: ${new Date(data.valid_until).toLocaleDateString('en-LK')}`];
    if (data.customer_name) lines.push(`Customer: ${data.customer_name}`);
    if (data.pricing_mode === 'wholesale') lines.push('Mode: Wholesale');
    lines.push('---');
    items.forEach(i => {
      lines.push(`${i.product_name}${i.variant_label ? ' (' + i.variant_label + ')' : ''}`);
      lines.push(`  ${i.quantity} x ${money(i.unit_price)} = ${money(i.quantity * i.unit_price)}`);
    });
    lines.push('---');
    lines.push(`Subtotal: ${money(data.subtotal)}`);
    if (Number(data.discount_total) > 0) lines.push(`Discount: -${money(data.discount_total)}`);
    if (Number(data.delivery_fee) > 0) lines.push(`Delivery: ${money(data.delivery_fee)}`);
    lines.push(`*TOTAL: ${money(data.grand_total)}*`);
    lines.push('', 'Payment: COD / Bank Transfer', 'Prices subject to change');
    return lines.join('\n');
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-slate-900/40" />
        <div className="relative rounded-2xl bg-white p-8 text-center shadow-xl">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
          <p className="mt-3 text-sm text-slate-500">Loading quotation...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
        <div className="relative rounded-2xl bg-white p-8 text-center shadow-xl">
          <p className="text-sm text-red-600">Could not load quotation.</p>
          <button onClick={onClose} className="mt-4 rounded-lg border px-4 py-2 text-sm">Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Action buttons */}
        <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
          <button onClick={handlePrint} className="flex-1 rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">Print</button>
          <button onClick={handleWhatsApp} disabled={whatsappBusy} className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
            {whatsappBusy ? 'Sharing...' : 'WhatsApp'}
          </button>
          <button onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">Close</button>
        </div>

        {/* Quotation preview */}
        <div className="flex-1 overflow-y-auto p-4">
          <div ref={ref} style={{ fontFamily: 'system-ui, sans-serif', padding: '24px', maxWidth: '500px', margin: '0 auto', color: '#1e293b' }}>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              {logoDataUrl && <img src={logoDataUrl} alt="" style={{ height: '48px', margin: '0 auto 8px' }} />}
              <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{storeName}</div>
              {settings?.address_line1 && <div style={{ fontSize: '12px', color: '#64748b' }}>{settings.address_line1}{settings.city ? `, ${settings.city}` : ''}</div>}
              {settings?.phone && <div style={{ fontSize: '12px', color: '#64748b' }}>{settings.phone}{settings.email ? ` | ${settings.email}` : ''}</div>}
            </div>

            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '20px', fontWeight: 'bold', letterSpacing: '2px', color: '#0f766e' }}>QUOTATION</div>
              <div style={{ fontSize: '13px', fontFamily: 'monospace', marginTop: '4px' }}>{data.quotation_number}</div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b', marginBottom: '12px' }}>
              <div>Date: {new Date(data.created_at).toLocaleDateString('en-LK', { year: 'numeric', month: 'short', day: 'numeric' })}</div>
              <div>Valid until: {new Date(data.valid_until).toLocaleDateString('en-LK', { year: 'numeric', month: 'short', day: 'numeric' })}</div>
            </div>

            {data.customer_name && (
              <div style={{ fontSize: '13px', marginBottom: '12px', padding: '8px 12px', background: '#f8fafc', borderRadius: '8px' }}>
                <strong>To:</strong> {data.customer_name}{data.customer_phone ? ` (${data.customer_phone})` : ''}
              </div>
            )}

            {data.pricing_mode === 'wholesale' && (
              <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#d97706', textAlign: 'center', marginBottom: '8px', padding: '4px', background: '#fffbeb', borderRadius: '4px' }}>
                WHOLESALE PRICING
              </div>
            )}

            {/* Items table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', marginBottom: '12px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ textAlign: 'left', padding: '6px 4px', fontWeight: '600' }}>Item</th>
                  <th style={{ textAlign: 'center', padding: '6px 4px', fontWeight: '600', width: '50px' }}>Qty</th>
                  <th style={{ textAlign: 'right', padding: '6px 4px', fontWeight: '600', width: '80px' }}>Price</th>
                  <th style={{ textAlign: 'right', padding: '6px 4px', fontWeight: '600', width: '90px' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '6px 4px' }}>
                      {item.product_name}
                      {item.variant_label && <div style={{ fontSize: '11px', color: '#94a3b8' }}>{item.variant_label}</div>}
                    </td>
                    <td style={{ textAlign: 'center', padding: '6px 4px' }}>{item.quantity}</td>
                    <td style={{ textAlign: 'right', padding: '6px 4px', fontFamily: 'monospace' }}>{money(item.unit_price)}</td>
                    <td style={{ textAlign: 'right', padding: '6px 4px', fontFamily: 'monospace' }}>{money(item.quantity * item.unit_price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: '8px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                <span>Subtotal</span><span style={{ fontFamily: 'monospace' }}>{money(data.subtotal)}</span>
              </div>
              {Number(data.discount_total) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', color: '#dc2626' }}>
                  <span>Discount</span><span style={{ fontFamily: 'monospace' }}>-{money(data.discount_total)}</span>
                </div>
              )}
              {Number(data.delivery_fee) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                  <span>Delivery Fee</span><span style={{ fontFamily: 'monospace' }}>{money(data.delivery_fee)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0 4px', fontWeight: 'bold', fontSize: '16px', borderTop: '1px solid #e2e8f0', marginTop: '4px' }}>
                <span>Grand Total</span><span style={{ fontFamily: 'monospace', color: '#0f766e' }}>{money(data.grand_total)}</span>
              </div>
            </div>

            {/* Terms */}
            <div style={{ marginTop: '16px', padding: '10px 12px', background: '#f8fafc', borderRadius: '8px', fontSize: '11px', color: '#64748b' }}>
              <div style={{ fontWeight: '600', marginBottom: '4px' }}>Terms & Conditions</div>
              <div>Prices subject to change without notice.</div>
              <div>Payment: Cash on Delivery / Bank Transfer</div>
              <div>This quotation is valid for 7 days from the date of issue.</div>
            </div>

            {data.notes && (
              <div style={{ marginTop: '8px', fontSize: '12px', color: '#64748b' }}>
                <strong>Notes:</strong> {data.notes}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const printCSS = `
  @page { size: A5; margin: 10mm; }
  body { font-family: system-ui, sans-serif; margin: 0; padding: 0; }
  img { max-width: 100%; }
  table { width: 100%; border-collapse: collapse; }
`;
