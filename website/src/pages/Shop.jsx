import {usePanelMotion} from '../components/StoreMotion';
import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { SlidersHorizontal, X, ChevronDown, Search, Loader2 } from 'lucide-react';
import api from '../api/client';
import ProductCard from '../components/ProductCard';
import PageHero from '../components/PageHero';
import SEO from '../components/SEO';
import useDialogFocus from '../components/useDialogFocus';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'best_selling', label: 'Best Selling' },
];
const PAGE_SIZE = 24;

export default function Shop() {
  const panelMotion=usePanelMotion('left');
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [alternatives,setAlternatives]=useState([]),[suggested,setSuggested]=useState(false);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mobileFilters, setMobileFilters] = useState(false);
  const filterDialogRef=useDialogFocus(mobileFilters,()=>setMobileFilters(false));
  const [definitions, setDefinitions] = useState([]);

  const category = searchParams.get('category') || '';
  const brand = searchParams.get('brand') || '';
  const sort = searchParams.get('sort') || 'newest';
  const search = searchParams.get('search') || '';
  const inStock = searchParams.get('inStock') || '';
  const onSale = searchParams.get('onSale') || '';
  const attributes = searchParams.get('attributes') || '';
  const minPrice = searchParams.get('minPrice') || '';
  const maxPrice = searchParams.get('maxPrice') || '';
  let selectedAttributes = {};
  try { const parsed = JSON.parse(attributes || '{}'); if (parsed && !Array.isArray(parsed) && typeof parsed === 'object') selectedAttributes = parsed; } catch { /* invalid query is handled by API */ }
  const requestedPage = Number(searchParams.get('page'));
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 && requestedPage <= 100000 ? requestedPage : 1;

  const setFilter = useCallback((key, value) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (key === 'category') next.delete('attributes');
      if (value) next.set(key, value);
      else next.delete(key);
      if (key !== 'page') next.delete('page');
      return next;
    });
  }, [setSearchParams]);

  const clearFilters = useCallback(() => {
    setSearchParams({});
  }, [setSearchParams]);

  useEffect(() => {
    api.get('/categories').then(r => setCategories(r.data.data)).catch(() => {});
    api.get('/brands').then(r => setBrands(r.data.data)).catch(() => {});
  }, []);

  useEffect(() => {
    setDefinitions([]);
    if (!category) return;
    const controller = new AbortController();
    api.get('/category-filters', {params:{category},signal:controller.signal}).then(r=>setDefinitions(r.data.data)).catch(()=>{});
    return()=>controller.abort();
  }, [category]);

  const toggleAttribute = (key, option) => {
    const values = Array.isArray(selectedAttributes[key]) ? selectedAttributes[key] : [];
    const next = {...selectedAttributes, [key]:values.includes(option)?values.filter(x=>x!==option):[...values,option]};
    if (!next[key].length) delete next[key];
    setFilter('attributes', Object.keys(next).length ? JSON.stringify(next) : '');
  };
  const extraFilters = <div className="space-y-5">
    <fieldset><legend className="mb-2 font-semibold">Price range (Rs.)</legend><div className="flex gap-2">
      <label className="min-w-0">Minimum<input type="number" min="0" className="w-full rounded border p-2" value={minPrice} onChange={e=>setFilter('minPrice',e.target.value)}/></label>
      <label className="min-w-0">Maximum<input type="number" min="0" className="w-full rounded border p-2" value={maxPrice} onChange={e=>setFilter('maxPrice',e.target.value)}/></label>
    </div></fieldset>
    {definitions.map(def=><fieldset key={def.key}><legend className="mb-2 font-semibold">{def.label}</legend>{def.options.map(option=><label key={option} className="flex gap-2 py-2"><input type="checkbox" checked={Array.isArray(selectedAttributes[def.key])&&selectedAttributes[def.key].includes(option)} onChange={()=>toggleAttribute(def.key,option)}/>{option}</label>)}</fieldset>)}
  </div>;

  useEffect(() => {
    setLoading(true);
    setError('');setAlternatives([]);setSuggested(false);
    const controller = new AbortController();
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (brand) params.set('brand', brand);
    if (sort) params.set('sort', sort);
    if (search) params.set('search', search);
    if (inStock) params.set('inStock', inStock);
    if (onSale) params.set('onSale', onSale);
    if (attributes) params.set('attributes', attributes);
    if (minPrice) params.set('minPrice', minPrice);
    if (maxPrice) params.set('maxPrice', maxPrice);
    params.set('limit', PAGE_SIZE);
    params.set('offset', (page - 1) * PAGE_SIZE);
    params.set('view', 'card');

    const timer = setTimeout(() => api.get(`/products?${params}`, { signal: controller.signal })
      .then(async r => {
        if (!controller.signal.aborted) {
          const data = r.data.data;
          setProducts(data.products || []);
          setTotal(Number(data.total) || 0);setSuggested(!!data.suggested);
          if(search&&!Number(data.total)){
            const fallback=new URLSearchParams(params);fallback.delete('search');fallback.set('limit','4');fallback.set('offset','0');
            const response=await api.get(`/products?${fallback}`,{signal:controller.signal});
            if(!controller.signal.aborted)setAlternatives(response.data.data.products||[]);
          }
          const lastPage = Math.max(1, Math.ceil((Number(data.total) || 0) / PAGE_SIZE));
          if (page > lastPage) setFilter('page', String(lastPage));
        }
      })
      .catch(() => { if (!controller.signal.aborted) setError('Unable to load products. Please retry.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); }), 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [category, brand, sort, search, inStock, onSale, page, attributes, minPrice, maxPrice, setFilter]);

  const activeFilterCount = [category, brand, inStock, onSale, search, minPrice, maxPrice].filter(Boolean).length + Object.keys(selectedAttributes).length;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <SEO title="Shop" path="/shop" description="Shop diapers, wet wipes, and trending baby items from top brands. Better prices, faster delivery, always in stock. Island-wide delivery across Sri Lanka." />
      <PageHero backgroundImage="/images/hero/hero-shop.jpg" headline="Shop Our Collection" subtitle="Premium diapers & wipes from trusted brands" focusPoint="center center" />

      <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
        {/* Mobile filter toggle + sort bar */}
        <div className="mb-6 flex items-center gap-3">
          <button
            onClick={() => setMobileFilters(true)}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 lg:hidden"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-500 text-xs text-white">{activeFilterCount}</span>
            )}
          </button>

          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={e => setFilter('search', e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-700 outline-none transition-colors focus:border-primary-300 focus:ring-2 focus:ring-primary-100"
            />
            {search && (
              <button onClick={() => setFilter('search', '')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            )}

          </div>

          {/* Sort dropdown */}
          <div className="relative">
            <select
              value={sort}
              onChange={e => setFilter('sort', e.target.value)}
              className="appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-4 pr-10 text-sm font-medium text-slate-700 outline-none transition-colors focus:border-primary-300 focus:ring-2 focus:ring-primary-100"
            >
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          </div>
        </div>

        {/* Active filter chips */}
        {activeFilterCount > 0 && (
          <div className="mb-6 flex flex-wrap items-center gap-2">
            {category && <FilterChip label={`Category: ${category}`} onRemove={() => setFilter('category', '')} />}
            {brand && <FilterChip label={`Brand: ${brand}`} onRemove={() => setFilter('brand', '')} />}
            {inStock && <FilterChip label="In Stock Only" onRemove={() => setFilter('inStock', '')} />}
            {onSale && <FilterChip label="On Sale" onRemove={() => setFilter('onSale', '')} />}
            {search && <FilterChip label={`"${search}"`} onRemove={() => setFilter('search', '')} />}
            {minPrice && <FilterChip label={`Minimum Rs. ${minPrice}`} onRemove={()=>setFilter('minPrice','')}/>}
            {maxPrice && <FilterChip label={`Maximum Rs. ${maxPrice}`} onRemove={()=>setFilter('maxPrice','')}/>}
            {Object.entries(selectedAttributes).flatMap(([key,options])=>Array.isArray(options)?options.map(option=><FilterChip key={`${key}:${option}`} label={`${definitions.find(def=>def.key===key)?.label||key}: ${option}`} onRemove={()=>toggleAttribute(key,option)}/>):[])}
            <button onClick={clearFilters} className="text-xs font-medium text-primary-600 hover:text-primary-700">Clear All</button>
          </div>
        )}

        <div className="flex gap-8">
          {/* Desktop sidebar filters */}
          <aside className="hidden w-60 shrink-0 lg:block">
            <div className="mb-6">{extraFilters}</div>
            <FilterPanel
              categories={categories}
              brands={brands}
              category={category}
              brand={brand}
              inStock={inStock}
              onSale={onSale}
              setFilter={setFilter}
            />
          </aside>

          {/* Product grid */}
          <div className="flex-1">
            <p role="status" className="mb-4 text-sm text-slate-600">{loading ? 'Loading products…' : `${total} products`}</p>
            {error && <p role="alert" className="mb-4 text-red-600">{error} <button type="button" className="underline" onClick={() => window.location.reload()}>Retry</button></p>}
            {loading ? (
              <div className="flex min-h-[40vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary-400" />
              </div>
            ) : products.length === 0 ? (
              <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
                <span className="mb-4 text-5xl">🔍</span>
                <h3 className="text-lg font-semibold text-slate-700">No products found</h3>
                <p className="mt-1 text-sm text-slate-500">Try adjusting your filters or search terms</p>
                <button onClick={clearFilters} className="mt-4 rounded-xl bg-primary-500 px-6 py-2 text-sm font-medium text-white hover:bg-primary-600">
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3">
                {products.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
              </div>
            )}
            {!loading && !error && total > PAGE_SIZE && (
              <nav aria-label="Product pages" className="mt-8 flex items-center justify-center gap-4 text-sm text-slate-600">
                <button type="button" disabled={page <= 1} onClick={() => setFilter('page', String(page - 1))}
                  className="rounded-xl border border-slate-200 px-4 py-2 disabled:opacity-40">Previous</button>
                <span aria-live="polite">Page {page} of {Math.ceil(total / PAGE_SIZE)}</span>
                <button type="button" disabled={page * PAGE_SIZE >= total} onClick={() => setFilter('page', String(page + 1))}
                  className="rounded-xl border border-slate-200 px-4 py-2 disabled:opacity-40">Next</button>
              </nav>
            )}
          </div>
        </div>
      </div>

      {suggested&&<p role="status" className="mx-auto max-w-7xl px-4 pb-4 text-primary-800">Showing close matches for “{search}”.</p>}
      {alternatives.length>0&&<section className="mx-auto max-w-7xl px-4 pb-12"><h2 className="mb-5 text-xl font-semibold">Other products matching your filters</h2><div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{alternatives.map(product=><ProductCard key={product.id} product={product}/>)}</div></section>}
      {/* Mobile filter drawer */}
      <AnimatePresence>
        {mobileFilters && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileFilters(false)}
              className="fixed inset-0 z-40 bg-black/40"
            />
            <motion.div
              ref={filterDialogRef} role="dialog" aria-modal="true" aria-label="Product filters" tabIndex={-1}
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            {...panelMotion}
              className="fixed inset-y-0 left-0 z-50 w-80 max-w-full overflow-y-auto bg-white p-6 shadow-2xl"
            >
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">Filters</h2>
                <button aria-label="Close filters" onClick={() => setMobileFilters(false)} className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-600">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <FilterPanel
                categories={categories}
                brands={brands}
                category={category}
                brand={brand}
                inStock={inStock}
                onSale={onSale}
                setFilter={setFilter}
              />
              <div className="mt-6">{extraFilters}</div>
              <button onClick={()=>setMobileFilters(false)} className="mt-6 w-full rounded bg-primary-600 p-3 text-white">Show results</button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function FilterPanel({ categories, brands, category, brand, inStock, onSale, setFilter }) {
  return (
    <div className="space-y-6">
      {/* Categories */}
      <FilterSection title="Category">
        <div className="space-y-1">
          <FilterRadio label="All Categories" checked={!category} onChange={() => setFilter('category', '')} />
          {categories.map(c => (
            <FilterRadio
              key={c.id}
              label={c.name}
              count={c.product_count}
              checked={category === c.name}
              onChange={() => setFilter('category', c.name)}
            />
          ))}
        </div>
      </FilterSection>

      {/* Brands */}
      <FilterSection title="Brand">
        <div className="space-y-1">
          <FilterRadio label="All Brands" checked={!brand} onChange={() => setFilter('brand', '')} />
          {brands.map(b => (
            <FilterRadio
              key={b.id}
              label={b.name}
              count={b.product_count}
              checked={brand === b.name}
              onChange={() => setFilter('brand', b.name)}
            />
          ))}
        </div>
      </FilterSection>

      {/* Availability */}
      <FilterSection title="Availability">
        <label className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-slate-50">
          <input
            type="checkbox"
            checked={inStock === 'true'}
            onChange={e => setFilter('inStock', e.target.checked ? 'true' : '')}
            className="h-4 w-4 rounded border-slate-300 text-primary-500 focus:ring-primary-300"
          />
          <span className="text-sm text-slate-700">In Stock Only</span>
        </label>
        <label className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-slate-50">
          <input
            type="checkbox"
            checked={onSale === 'true'}
            onChange={e => setFilter('onSale', e.target.checked ? 'true' : '')}
            className="h-4 w-4 rounded border-slate-300 text-primary-500 focus:ring-primary-300"
          />
          <span className="text-sm text-slate-700">On Sale</span>
        </label>
      </FilterSection>
    </div>
  );
}

function FilterSection({ title, children }) {
  return (
    <div>
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</h3>
      {children}
    </div>
  );
}

function FilterRadio({ label, count, checked, onChange }) {
  return (
    <button
      aria-pressed={checked}
      onClick={onChange}
      className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${
        checked ? 'bg-primary-50 font-medium text-primary-700' : 'text-slate-600 hover:bg-slate-50'
      }`}
    >
      {label}
      {count != null && <span className="text-xs text-slate-500">{count}</span>}
    </button>
  );
}

function FilterChip({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700">
      {label}
      <button aria-label={`Remove ${label} filter`} onClick={onRemove} className="rounded-full p-0.5 hover:bg-primary-100">
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}
