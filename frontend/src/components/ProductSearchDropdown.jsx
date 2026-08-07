import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fuzzySearchProducts } from '../utils/fuzzySearch';

function money(n) {
  return `Rs. ${Number(n || 0).toFixed(2)}`;
}

function HighlightedSku({ sku, indices }) {
  if (!indices || !sku) return <span className="font-mono text-slate-500 dark:text-slate-400">{sku}</span>;
  const set = new Set(indices);
  return (
    <span className="font-mono">
      {sku.split('').map((ch, i) => (
        <span key={i} className={set.has(i) ? 'font-semibold text-brand-600 dark:text-brand-400' : 'text-slate-400 dark:text-slate-500'}>{ch}</span>
      ))}
    </span>
  );
}

function StockBadge({ stock, threshold }) {
  const t = threshold ?? 5;
  if (stock <= 0) return <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-400">Out</span>;
  if (stock <= t) return <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">{stock}</span>;
  return <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">{stock}</span>;
}

export default function ProductSearchDropdown({
  products,
  value,
  onChange,
  onSelect,
  placeholder = 'Search by name, SKU, barcode...',
  maxResults = 12,
  className = '',
  autoFocus = false,
  inputRef: externalRef,
  showDropdownOnEmpty = false,
}) {
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const internalRef = useRef(null);
  const ref = externalRef || internalRef;
  const listRef = useRef(null);
  const [debouncedValue, setDebouncedValue] = useState(value);
  const debounceTimer = useRef(null);

  useEffect(() => {
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => setDebouncedValue(value), 250);
    return () => clearTimeout(debounceTimer.current);
  }, [value]);

  const results = useMemo(() => {
    if (!debouncedValue?.trim() && !showDropdownOnEmpty) return [];
    return fuzzySearchProducts(products, debouncedValue).slice(0, maxResults);
  }, [products, debouncedValue, maxResults, showDropdownOnEmpty]);

  const showDropdown = open && (results.length > 0 || (debouncedValue?.trim()?.length > 0));

  useEffect(() => { setActiveIdx(-1); }, [results]);

  useEffect(() => {
    if (activeIdx >= 0 && listRef.current) {
      const el = listRef.current.children[activeIdx];
      if (el) el.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIdx]);

  const handleKeyDown = useCallback((e) => {
    if (!showDropdown) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter' && activeIdx >= 0) { e.preventDefault(); onSelect(results[activeIdx]); setOpen(false); }
    else if (e.key === 'Escape') { setOpen(false); }
  }, [showDropdown, results, activeIdx, onSelect]);

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          ref={ref}
          type="text"
          value={value}
          onChange={e => { onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-8 text-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-brand-500"
        />
        {value && (
          <button type="button" onClick={() => { onChange(''); ref.current?.focus(); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        )}
      </div>

      {showDropdown && (
        <div ref={listRef} className="absolute left-0 right-0 top-full z-40 mt-1 max-h-80 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
          {results.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-slate-400">
              No products match — try fewer characters
            </div>
          ) : (
            results.map((p, i) => {
              const imgUrl = p.image_url || (p.images?.[0]?.image_url);
              return (
                <button
                  key={p.variant_id || p.id || i}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); onSelect(p); setOpen(false); }}
                  className={`flex w-full items-center gap-3 px-3 py-2 text-left transition ${i === activeIdx ? 'bg-brand-50 dark:bg-brand-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                >
                  {imgUrl ? (
                    <img src={imgUrl} alt="" className="h-10 w-10 shrink-0 rounded-lg border border-slate-200 object-cover dark:border-slate-700" />
                  ) : (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400 dark:bg-slate-700">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                      {p.name || p.product_name}
                    </p>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-slate-500 dark:text-slate-400">{p.variant_label}</span>
                      <span className="text-slate-300 dark:text-slate-600">·</span>
                      <HighlightedSku sku={p.sku} indices={p._skuIndices} />
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-mono text-sm font-medium text-slate-900 dark:text-white">{money(p.retail_price)}</p>
                    <StockBadge stock={p.current_stock} threshold={p.low_stock_threshold} />
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
