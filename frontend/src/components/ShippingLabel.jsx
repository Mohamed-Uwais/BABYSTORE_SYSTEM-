import { useEffect, useRef, useState } from 'react';
import JsBarcode from 'jsbarcode';
import client from '../api/client';

function money(n) {
  return `Rs. ${Number(n || 0).toFixed(2)}`;
}

export default function ShippingLabel({ order, onClose }) {
  const [settings, setSettings] = useState(null);
  const barcodeRef = useRef(null);

  useEffect(() => {
    client.get('/settings').then(r => setSettings(r.data.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (barcodeRef.current && order?.order_number) {
      try {
        JsBarcode(barcodeRef.current, order.order_number, {
          format: 'CODE128',
          width: 1.5,
          height: 40,
          displayValue: true,
          fontSize: 12,
          font: 'monospace',
          margin: 5,
          background: '#ffffff',
          lineColor: '#000000',
        });
      } catch {}
    }
  }, [order, settings]);

  function printLabel() {
    const content = document.getElementById('shipping-label-print');
    if (!content) return;

    const barcodeDataUrl = barcodeRef.current?.toDataURL?.() ||
      (barcodeRef.current?.querySelector?.('image')?.href?.baseVal) || '';

    let barcodeHtml = '';
    if (barcodeRef.current?.tagName === 'svg' || barcodeRef.current?.tagName === 'SVG') {
      barcodeHtml = barcodeRef.current.outerHTML;
    } else if (barcodeRef.current?.toDataURL) {
      barcodeHtml = `<img src="${barcodeRef.current.toDataURL()}" style="max-width:100%;" />`;
    }

    const store = settings || {};
    const delivery = order.delivery || order;
    const isPaid = !order.delivery_fee || order.delivery_fee <= 0;
    const totalItems = order.items?.reduce((s, i) => s + (i.quantity || 1), 0) || 0;

    const win = window.open('', '_blank', 'width=420,height=630');
    win.document.write(`<!DOCTYPE html><html><head><title>Label - ${order.order_number}</title>
<style>
  @page { size: 100mm 150mm; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; width: 100mm; height: 150mm; padding: 4mm; }
  .label { border: 2px solid #000; height: 100%; display: flex; flex-direction: column; }
  .header { text-align: center; padding: 3mm 3mm 2mm; border-bottom: 2px solid #000; }
  .header h1 { font-size: 16px; margin-bottom: 1px; }
  .header p { font-size: 9px; color: #555; }
  .order-bar { display: flex; justify-content: space-between; align-items: center; padding: 2mm 3mm; border-bottom: 1px solid #000; }
  .order-num { font-family: monospace; font-size: 15px; font-weight: bold; }
  .cod-badge { font-size: 13px; font-weight: bold; padding: 1mm 3mm; border: 2px solid; border-radius: 3px; }
  .cod-badge.cod { border-color: #d97706; color: #d97706; background: #fffbeb; }
  .cod-badge.paid { border-color: #059669; color: #059669; background: #ecfdf5; }
  .receiver { padding: 3mm; border-bottom: 1px solid #000; flex: 1; }
  .section-label { font-size: 8px; text-transform: uppercase; color: #888; letter-spacing: 0.5px; margin-bottom: 1mm; }
  .receiver-name { font-size: 14px; font-weight: bold; margin-bottom: 1mm; }
  .receiver-phone { font-size: 12px; margin-bottom: 1mm; }
  .receiver-address { font-size: 11px; line-height: 1.4; color: #333; }
  .from-section { padding: 2mm 3mm; border-bottom: 1px solid #000; }
  .from-section p { font-size: 9px; color: #555; }
  .from-section .name { font-size: 10px; font-weight: bold; color: #000; }
  .items-bar { padding: 2mm 3mm; border-bottom: 1px solid #000; display: flex; justify-content: space-between; font-size: 10px; }
  .barcode { text-align: center; padding: 2mm 3mm; }
  .barcode svg, .barcode img { max-width: 90%; height: auto; }
  @media print { body { padding: 0; } }
</style></head><body>
<div class="label">
  <div class="header">
    <h1>${store.store_name || 'LITTORA'}</h1>
    <p>${[store.phone, store.address_line1, store.city].filter(Boolean).join(' · ')}</p>
  </div>
  <div class="order-bar">
    <span class="order-num">${order.order_number}</span>
    <span class="cod-badge ${isPaid ? 'paid' : 'cod'}">${isPaid ? 'PAID' : 'COD ' + money(order.grand_total)}</span>
  </div>
  <div class="receiver">
    <p class="section-label">Deliver To</p>
    <p class="receiver-name">${delivery.receiver_name || order.customer_name || 'Customer'}</p>
    <p class="receiver-phone">${delivery.receiver_phone || order.customer_phone || ''}</p>
    <p class="receiver-address">${delivery.receiver_address || order.delivery_address || ''}</p>
  </div>
  <div class="from-section">
    <p class="section-label">From</p>
    <p class="name">${store.store_name || 'LITTORA'}</p>
    <p>${[store.address_line1, store.city].filter(Boolean).join(', ')} ${store.phone ? '· ' + store.phone : ''}</p>
  </div>
  <div class="items-bar">
    <span><strong>${order.items?.length || 0}</strong> items</span>
    <span><strong>${totalItems}</strong> units</span>
    <span>Total: <strong>${money(order.grand_total)}</strong></span>
  </div>
  <div class="barcode">${barcodeHtml}</div>
</div>
</body></html>`);
    win.document.close();
    setTimeout(() => win.print(), 400);
  }

  if (!order) return null;
  const delivery = order.delivery || order;
  const store = settings || {};
  const isPaid = !order.delivery_fee || order.delivery_fee <= 0;
  const totalItems = order.items?.reduce((s, i) => s + (i.quantity || 1), 0) || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70" onClick={onClose}>
      <div className="relative mx-4 max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900" onClick={e => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Shipping Label</h2>
          <div className="flex gap-2">
            <button onClick={printLabel}
              className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700 active:scale-[0.97]">Print</button>
            <button onClick={onClose}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">Close</button>
          </div>
        </div>

        <div id="shipping-label-print" className="rounded-xl border-2 border-slate-900 dark:border-slate-300">
          {/* Header */}
          <div className="border-b-2 border-slate-900 px-4 py-3 text-center dark:border-slate-300">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">{store.store_name || 'LITTORA'}</h3>
            <p className="text-[10px] text-slate-500">{[store.phone, store.address_line1, store.city].filter(Boolean).join(' · ')}</p>
          </div>

          {/* Order + COD */}
          <div className="flex items-center justify-between border-b border-slate-300 px-4 py-2 dark:border-slate-600">
            <span className="font-mono text-sm font-bold text-slate-900 dark:text-white">{order.order_number}</span>
            <span className={`rounded border-2 px-2 py-0.5 text-xs font-bold ${
              isPaid
                ? 'border-emerald-500 bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'
                : 'border-amber-500 bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400'
            }`}>
              {isPaid ? 'PAID' : `COD ${money(order.grand_total)}`}
            </span>
          </div>

          {/* Receiver */}
          <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-700">
            <p className="mb-1 text-[9px] font-semibold uppercase tracking-wide text-slate-400">Deliver To</p>
            <p className="text-sm font-bold text-slate-900 dark:text-white">
              {delivery.receiver_name || order.customer_name || 'Customer'}
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {delivery.receiver_phone || order.customer_phone || ''}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {delivery.receiver_address || order.delivery_address || ''}
            </p>
          </div>

          {/* From */}
          <div className="border-b border-slate-200 px-4 py-2 dark:border-slate-700">
            <p className="mb-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-400">From</p>
            <p className="text-xs font-medium text-slate-700 dark:text-slate-300">{store.store_name || 'LITTORA'}</p>
            <p className="text-[10px] text-slate-500">{[store.address_line1, store.city].filter(Boolean).join(', ')} {store.phone ? `· ${store.phone}` : ''}</p>
          </div>

          {/* Items summary */}
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2 text-xs dark:border-slate-700">
            <span className="text-slate-500"><b className="text-slate-700 dark:text-slate-300">{order.items?.length || 0}</b> items</span>
            <span className="text-slate-500"><b className="text-slate-700 dark:text-slate-300">{totalItems}</b> units</span>
            <span className="text-slate-500">Total: <b className="font-mono text-slate-700 dark:text-slate-300">{money(order.grand_total)}</b></span>
          </div>

          {/* Barcode */}
          <div className="px-4 py-3 text-center">
            <svg ref={barcodeRef} className="mx-auto" />
          </div>
        </div>
      </div>
    </div>
  );
}
