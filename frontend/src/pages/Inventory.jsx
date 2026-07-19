import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import client from '../api/client';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import PageWrapper from '../components/PageWrapper';
import BarcodeScanner from '../components/BarcodeScanner';
import EmptyState from '../components/EmptyState';
import { TableSkeleton } from '../components/Skeleton';

function money(n) {
  return `Rs. ${Number(n || 0).toFixed(2)}`;
}

function ScanIcon({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
      <line x1="7" y1="12" x2="17" y2="12" />
    </svg>
  );
}

function MultiImageManager({ productId, images, onChange, maxImages = 5 }) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const toast = useToast();
  const fileRef = useCallback((node) => { if (node) node.value = ''; }, []);

  async function handleUpload(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const allowed = maxImages - images.length;
    if (files.length > allowed) {
      toast.error(`Can only add ${allowed} more image${allowed !== 1 ? 's' : ''} (max ${maxImages})`);
      e.target.value = '';
      return;
    }
    setUploading(true);
    const newImages = [];
    for (let i = 0; i < files.length; i++) {
      setUploadProgress(`Uploading ${i + 1}/${files.length}...`);
      try {
        const fd = new FormData();
        fd.append('image', files[i]);
        if (productId) {
          const res = await client.post(`/products/${productId}/images`, fd);
          newImages.push(res.data.data);
        } else {
          const res = await client.post('/products/upload-image', fd);
          newImages.push({ image_url: res.data.data.image_url, sort_order: images.length + newImages.length, is_primary: images.length === 0 && newImages.length === 0 });
        }
      } catch { toast.error(`Failed to upload image ${i + 1}`); }
    }
    if (newImages.length) onChange([...images, ...newImages]);
    setUploading(false);
    setUploadProgress('');
    e.target.value = '';
  }

  function moveImage(idx, dir) {
    const arr = [...images];
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= arr.length) return;
    [arr[idx], arr[swapIdx]] = [arr[swapIdx], arr[idx]];
    arr.forEach((img, i) => { img.sort_order = i; });
    onChange(arr);
    if (productId) {
      client.put(`/products/${productId}/images/reorder`, { images: arr.map(im => ({ id: im.id, sort_order: im.sort_order })) }).catch(() => {});
    }
  }

  async function setPrimary(idx) {
    const arr = images.map((img, i) => ({ ...img, is_primary: i === idx }));
    onChange(arr);
    if (productId && arr[idx].id) {
      await client.put(`/products/images/${arr[idx].id}/primary`, { product_id: productId }).catch(() => {});
    }
  }

  async function removeImage(idx) {
    const img = images[idx];
    if (productId && img.id) {
      await client.delete(`/products/images/${img.id}`).catch(() => {});
    }
    const arr = images.filter((_, i) => i !== idx);
    if (img.is_primary && arr.length > 0) arr[0].is_primary = true;
    onChange(arr);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Product Images ({images.length}/{maxImages})</p>
        {images.length < maxImages && (
          <label className="cursor-pointer text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">
            {uploading ? uploadProgress : '+ Add Images'}
            <input type="file" accept="image/png,image/jpeg,image/webp" multiple className="hidden" onChange={handleUpload} disabled={uploading} />
          </label>
        )}
      </div>
      {images.length === 0 ? (
        <label className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed py-6 transition ${uploading ? 'border-brand-400 text-brand-500' : 'border-slate-300 text-slate-400 hover:border-brand-400 hover:text-brand-500'} dark:border-slate-600`}>
          {uploading ? (
            <span className="text-xs font-medium">{uploadProgress}</span>
          ) : (
            <>
              <svg className="mb-1 h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              <span className="text-xs font-medium">Click to select images (2–5 recommended)</span>
              <span className="mt-0.5 text-[10px]">JPEG, PNG, WebP · select multiple files at once</span>
            </>
          )}
          <input type="file" accept="image/png,image/jpeg,image/webp" multiple className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
      ) : (
        <div className="flex flex-wrap gap-2">
          {images.map((img, idx) => (
            <div key={img.id || img.image_url} className={`group relative h-20 w-20 rounded-xl border-2 overflow-hidden ${img.is_primary ? 'border-brand-500 ring-2 ring-brand-200' : 'border-slate-200 dark:border-slate-700'}`}>
              <img src={img.image_url} alt="" className="h-full w-full object-cover" />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 bg-black/50 opacity-0 transition group-hover:opacity-100">
                {!img.is_primary && (
                  <button type="button" onClick={() => setPrimary(idx)} className="rounded bg-white/90 px-1.5 py-0.5 text-[9px] font-bold text-slate-700 hover:bg-white">★ Primary</button>
                )}
                <div className="flex gap-1">
                  {idx > 0 && <button type="button" onClick={() => moveImage(idx, -1)} className="rounded bg-white/90 px-1 py-0.5 text-[10px] text-slate-700 hover:bg-white">←</button>}
                  {idx < images.length - 1 && <button type="button" onClick={() => moveImage(idx, 1)} className="rounded bg-white/90 px-1 py-0.5 text-[10px] text-slate-700 hover:bg-white">→</button>}
                </div>
                <button type="button" onClick={() => removeImage(idx)} className="rounded bg-red-500/90 px-1.5 py-0.5 text-[9px] font-bold text-white hover:bg-red-600">✕</button>
              </div>
              {img.is_primary && (
                <span className="absolute bottom-0 inset-x-0 bg-brand-600 text-center text-[8px] font-bold text-white py-0.5">PRIMARY</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const BLANK_VARIANT = {
  sku: '', barcode: '', variant_label: '', cost_price: '', wholesale_price: '',
  retail_price: '', mrp: '', current_stock: '', low_stock_threshold: '', image_url: '',
  discount_type: 'none', discount_value: '', weight_grams: '',
  price_tiers: [],
};

const BLANK_TIER = { min_quantity: '', tier_price: '', label: '' };

function PriceTierEditor({ tiers, onChange }) {
  function updateTier(idx, field, value) {
    onChange(tiers.map((t, i) => (i === idx ? { ...t, [field]: value } : t)));
  }
  function removeTier(idx) { onChange(tiers.filter((_, i) => i !== idx)); }
  function addTier() { onChange([...tiers, { ...BLANK_TIER }]); }

  return (
    <div className="rounded-xl border border-dashed border-slate-300 p-3 dark:border-slate-600">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Bulk Pricing</p>
        <button type="button" onClick={addTier} className="text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">+ Add Tier</button>
      </div>
      {tiers.length === 0 && (
        <p className="text-xs text-slate-400 italic">No bulk pricing tiers. Add tiers for multi-pack discounts.</p>
      )}
      {tiers.map((t, idx) => (
        <div key={idx} className="mb-1.5 flex items-center gap-2">
          <input type="number" min="2" placeholder="Qty" value={t.min_quantity} onChange={(e) => updateTier(idx, 'min_quantity', e.target.value)} className={`${ic} w-16 font-mono text-center`} />
          <span className="text-xs text-slate-400">packs =</span>
          <input type="number" min="0" step="0.01" placeholder="Total price" value={t.tier_price} onChange={(e) => updateTier(idx, 'tier_price', e.target.value)} className={`${ic} w-28 font-mono`} />
          <input placeholder="Label (optional)" value={t.label} onChange={(e) => updateTier(idx, 'label', e.target.value)} className={`${ic} min-w-0 flex-1`} />
          <button type="button" onClick={() => removeTier(idx)} className="text-slate-400 hover:text-red-500 text-sm">✕</button>
        </div>
      ))}
    </div>
  );
}

const ic = 'rounded-xl border border-slate-200 px-2.5 py-1.5 text-sm outline-none transition focus:border-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white';

export default function Inventory() {
  const toast = useToast();
  const { hasPermission } = useAuth();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showAddProduct, setShowAddProduct] = useState(false);
  const [adjustFor, setAdjustFor] = useState(null);
  const [historyFor, setHistoryFor] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editingVariant, setEditingVariant] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [p, c, b] = await Promise.all([
        client.get('/products'),
        client.get('/catalog/categories'),
        client.get('/catalog/brands'),
      ]);
      setProducts(p.data.data);
      setCategories(c.data.data);
      setBrands(b.data.data);
    } finally { setLoading(false); }
  }

  const grouped = useMemo(() => {
    const map = new Map();
    for (const row of products) {
      if (!map.has(row.id)) {
        map.set(row.id, { id: row.id, name: row.name, category_name: row.category_name, brand_name: row.brand_name,
          category_id: row.category_id, brand_id: row.brand_id, description: row.description,
          is_active: row.is_active, tags: row.tags || [], images: row.images || [], variants: [] });
      }
      if (row.variant_id) map.get(row.id).variants.push(row);
    }
    return [...map.values()];
  }, [products]);

  async function handleDeleteProduct(product) {
    try {
      const res = await client.delete(`/products/${product.id}`);
      toast.success(res.data.action === 'deactivated' ? 'Product deactivated (has order history)' : 'Product deleted');
      setConfirmDelete(null);
      loadAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  }

  async function handleDeleteVariant(variant) {
    try {
      const res = await client.delete(`/products/variants/${variant.variant_id}`);
      toast.success(res.data.action === 'deactivated' ? 'Variant deactivated (has order history)' : 'Variant deleted');
      setConfirmDelete(null);
      loadAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  }

  return (
    <PageWrapper className="flex h-full flex-col bg-slate-50 dark:bg-slate-950">
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="mx-auto max-w-5xl space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold text-slate-900 dark:text-white">Inventory</h1>
            <button onClick={() => setShowAddProduct((v) => !v)}
              className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700 active:scale-[0.97]">
              {showAddProduct ? 'Cancel' : '+ Add product'}
            </button>
          </div>

          {error && <div className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">{error}</div>}

          <AnimatePresence>
            {showAddProduct && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <AddProductForm categories={categories} brands={brands}
                  onCreated={() => { setShowAddProduct(false); loadAll(); toast.success('Product created'); }}
                  onError={setError} onCatalogChange={loadAll} />
              </motion.div>
            )}
          </AnimatePresence>

          {loading ? <TableSkeleton rows={8} /> : grouped.length === 0 ? (
            <EmptyState icon="📦" title="No products yet" description="Add your first product to get started" action={
              <button onClick={() => setShowAddProduct(true)} className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">+ Add product</button>
            } />
          ) : (
            <div className="space-y-4">
              {grouped.map((product) => (
                <section key={product.id} className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <h2 className="font-semibold text-slate-900 dark:text-white">{product.name}</h2>
                      {product.tags.map(t => (
                        <span key={t.id || t.tag_id} className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-medium text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">{t.name || t.tag_name}</span>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 dark:text-slate-500">
                        {product.category_name}{product.brand_name ? ` · ${product.brand_name}` : ''}
                      </span>
                      <button onClick={() => setEditingProduct(product)} className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800">Edit</button>
                      <button onClick={() => setConfirmDelete({ type: 'product', item: product })} className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20">Delete</button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400 dark:border-slate-800">
                          <th className="pb-2 font-medium">Variant</th>
                          <th className="pb-2 font-medium">SKU</th>
                          <th className="pb-2 text-right font-medium">Cost</th>
                          <th className="pb-2 text-right font-medium">Retail</th>
                          <th className="pb-2 text-right font-medium">Stock</th>
                          <th className="pb-2 text-right font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                        {product.variants.map((v) => (
                          <VariantRow key={v.variant_id} v={v}
                            onEdit={() => setEditingVariant({ ...v, product_name: product.name })}
                            onAdjust={() => setAdjustFor(v)}
                            onHistory={() => setHistoryFor(v)}
                            onDelete={() => setConfirmDelete({ type: 'variant', item: v })}
                            onPriceUpdate={loadAll}
                            canEditPrice={hasPermission('settings')}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>

      {adjustFor && <AdjustDrawer variant={adjustFor} onClose={() => setAdjustFor(null)} onDone={() => { setAdjustFor(null); loadAll(); toast.success('Stock adjusted'); }} onError={setError} />}
      {historyFor && <HistoryDrawer variant={historyFor} onClose={() => setHistoryFor(null)} />}
      {editingProduct && <EditProductDrawer product={editingProduct} categories={categories} brands={brands} initialImages={editingProduct.images || []} onClose={() => setEditingProduct(null)} onSaved={() => { setEditingProduct(null); loadAll(); toast.success('Product updated'); }} />}
      {editingVariant && <EditVariantDrawer variant={editingVariant} onClose={() => setEditingVariant(null)} onSaved={() => { setEditingVariant(null); loadAll(); toast.success('Variant updated'); }} />}
      {confirmDelete && <ConfirmDeleteModal item={confirmDelete} onClose={() => setConfirmDelete(null)} onConfirm={() => confirmDelete.type === 'product' ? handleDeleteProduct(confirmDelete.item) : handleDeleteVariant(confirmDelete.item)} />}
    </PageWrapper>
  );
}

function VariantRow({ v, onEdit, onAdjust, onHistory, onDelete, onPriceUpdate, canEditPrice }) {
  const toast = useToast();
  const [editingPrice, setEditingPrice] = useState(null);
  const [priceValue, setPriceValue] = useState('');
  const threshold = v.low_stock_threshold ?? 5;
  const low = v.current_stock <= threshold;

  async function savePrice(field) {
    try {
      await client.put(`/products/variants/${v.variant_id}`, {
        sku: v.sku, barcode: v.barcode, variant_label: v.variant_label,
        cost_price: field === 'cost_price' ? Number(priceValue) : v.cost_price,
        wholesale_price: v.wholesale_price,
        retail_price: field === 'retail_price' ? Number(priceValue) : v.retail_price,
        mrp: v.mrp, discount_type: v.discount_type || 'none', discount_value: v.discount_value || 0,
        low_stock_threshold: v.low_stock_threshold,
      });
      setEditingPrice(null);
      onPriceUpdate();
      toast.success('Price updated');
    } catch { toast.error('Failed to update price'); }
  }

  function renderPrice(field, value) {
    if (editingPrice === field) {
      return (
        <input autoFocus type="number" value={priceValue}
          onChange={(e) => setPriceValue(e.target.value)}
          onBlur={() => savePrice(field)}
          onKeyDown={(e) => { if (e.key === 'Enter') savePrice(field); if (e.key === 'Escape') setEditingPrice(null); }}
          className="w-20 rounded border border-brand-400 px-1 py-0.5 text-right font-mono text-sm outline-none dark:bg-slate-800 dark:text-white" />
      );
    }
    return (
      <span className={`cursor-pointer font-mono ${canEditPrice ? 'hover:text-brand-600 hover:underline' : ''} ${field === 'retail_price' ? 'text-slate-700 dark:text-slate-300' : 'text-slate-500 dark:text-slate-400'}`}
        onClick={() => { if (!canEditPrice) return; setEditingPrice(field); setPriceValue(value || 0); }}>
        {money(value)}
      </span>
    );
  }

  return (
    <tr>
      <td className="py-2.5">
        <div className="flex items-center gap-2">
          {v.image_url && <img src={v.image_url} alt="" className="h-7 w-7 rounded-md object-cover" />}
          <span className="text-slate-700 dark:text-slate-300">{v.variant_label}</span>
        </div>
      </td>
      <td className="py-2.5 font-mono text-slate-500 dark:text-slate-400">{v.sku}</td>
      <td className="py-2.5 text-right">{renderPrice('cost_price', v.cost_price)}</td>
      <td className="py-2.5 text-right">{renderPrice('retail_price', v.retail_price)}</td>
      <td className="py-2.5 text-right">
        <span className={`font-mono ${low ? 'font-medium text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-300'}`}>{v.current_stock}</span>
      </td>
      <td className="py-2.5 text-right">
        <div className="flex justify-end gap-1.5">
          <button onClick={onEdit} className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800">Edit</button>
          <button onClick={onAdjust} className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800">Adjust</button>
          <button onClick={onHistory} className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800">History</button>
          <button onClick={onDelete} className="rounded-lg border border-red-200 px-2 py-1 text-xs font-medium text-red-500 transition hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20">×</button>
        </div>
      </td>
    </tr>
  );
}

function EditProductDrawer({ product, categories, brands, onClose, onSaved, initialImages }) {
  const [form, setForm] = useState({
    name: product.name,
    category_id: product.category_id || '',
    brand_id: product.brand_id || '',
    description: product.description || '',
    low_stock_threshold: 5,
  });
  const [allTags, setAllTags] = useState([]);
  const [selectedTagIds, setSelectedTagIds] = useState(product.tags.map(t => t.id || t.tag_id));
  const [productImages, setProductImages] = useState(initialImages || []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    client.get('/tags').then(r => setAllTags(r.data.data || [])).catch(() => {});
    if (!initialImages) {
      client.get(`/products/${product.id}/images`).then(r => setProductImages(r.data.data || [])).catch(() => {});
    }
  }, []);

  async function save() {
    setSaving(true);
    setError('');
    try {
      await client.put(`/products/${product.id}`, {
        name: form.name,
        category_id: Number(form.category_id),
        brand_id: form.brand_id ? Number(form.brand_id) : null,
        description: form.description,
        low_stock_threshold: Number(form.low_stock_threshold) || 5,
        is_active: true,
      });
      await client.put(`/tags/products/${product.id}`, { tag_ids: selectedTagIds });
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || 'Update failed');
    } finally { setSaving(false); }
  }

  return (
    <Drawer onClose={onClose} title="Edit Product">
      <div className="space-y-3">
        {error && <div className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">{error}</div>}
        <input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Product name" className={`${ic} w-full`} />
        <select value={form.category_id} onChange={(e) => setForm(f => ({ ...f, category_id: e.target.value }))} className={`${ic} w-full`}>
          <option value="">Category...</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={form.brand_id} onChange={(e) => setForm(f => ({ ...f, brand_id: e.target.value }))} className={`${ic} w-full`}>
          <option value="">Brand (optional)...</option>
          {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Description" rows={3} className={`${ic} w-full`} />
        <input type="number" value={form.low_stock_threshold} onChange={(e) => setForm(f => ({ ...f, low_stock_threshold: e.target.value }))} placeholder="Low stock threshold" className={`${ic} w-full`} />
        {allTags.length > 0 && (
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">Tags</p>
            <div className="flex flex-wrap gap-2">
              {allTags.map(t => (
                <button key={t.id} type="button" onClick={() => setSelectedTagIds(prev => prev.includes(t.id) ? prev.filter(x => x !== t.id) : [...prev, t.id])}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${selectedTagIds.includes(t.id) ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'}`}>{t.name}</button>
              ))}
            </div>
          </div>
        )}
        <MultiImageManager productId={product.id} images={productImages} onChange={setProductImages} />
        <button onClick={save} disabled={saving} className="w-full rounded-xl bg-brand-600 py-2.5 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-50">
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </Drawer>
  );
}

function EditVariantDrawer({ variant, onClose, onSaved }) {
  const [form, setForm] = useState({
    variant_label: variant.variant_label || '',
    sku: variant.sku || '',
    barcode: variant.barcode || '',
    cost_price: variant.cost_price || 0,
    wholesale_price: variant.wholesale_price || 0,
    retail_price: variant.retail_price || 0,
    mrp: variant.mrp || '',
    discount_type: variant.discount_type || 'none',
    discount_value: variant.discount_value || '',
    weight_grams: variant.weight_grams || '',
    low_stock_threshold: variant.low_stock_threshold || '',
    image_url: variant.image_url || '',
  });
  const [priceTiers, setPriceTiers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [scanOpen, setScanOpen] = useState(false);

  useEffect(() => {
    client.get(`/products/variants/${variant.variant_id}/price-tiers`)
      .then(r => setPriceTiers(r.data.data || []))
      .catch(() => {});
  }, [variant.variant_id]);

  function upd(key, val) { setForm(f => ({ ...f, [key]: val })); }

  async function uploadImage(file) {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const res = await client.post('/products/upload-image', fd);
      upd('image_url', res.data.data.image_url);
    } catch { setError('Image upload failed'); }
    finally { setUploading(false); }
  }

  async function save() {
    setSaving(true);
    setError('');
    try {
      await client.put(`/products/variants/${variant.variant_id}`, {
        ...form,
        cost_price: Number(form.cost_price) || 0,
        wholesale_price: Number(form.wholesale_price) || 0,
        retail_price: Number(form.retail_price) || 0,
        mrp: form.mrp ? Number(form.mrp) : null,
        discount_value: Number(form.discount_value) || 0,
        low_stock_threshold: form.low_stock_threshold ? Number(form.low_stock_threshold) : null,
        barcode: form.barcode || null,
        image_url: form.image_url || null,
        price_tiers: priceTiers.filter(t => t.min_quantity && t.tier_price).map(t => ({
          min_quantity: Number(t.min_quantity), tier_price: Number(t.tier_price), label: t.label || null,
        })),
      });
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || 'Update failed');
    } finally { setSaving(false); }
  }

  return (
    <Drawer onClose={onClose} title="Edit Variant">
      <p className="mb-4 text-sm font-medium text-slate-500 dark:text-slate-400">{variant.product_name}</p>
      <div className="space-y-3">
        {error && <div className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">{error}</div>}
        <input value={form.variant_label} onChange={(e) => upd('variant_label', e.target.value)} placeholder="Label (e.g. Size M)" className={`${ic} w-full`} />
        <input value={form.sku} onChange={(e) => upd('sku', e.target.value)} placeholder="SKU" className={`${ic} w-full font-mono`} />
        <div className="flex gap-2">
          <input value={form.barcode} onChange={(e) => upd('barcode', e.target.value)} placeholder="Barcode" className={`${ic} min-w-0 flex-1 font-mono`} />
          <button type="button" onClick={() => setScanOpen(true)} className="flex shrink-0 items-center justify-center rounded-xl border border-slate-200 px-2 text-slate-500 transition hover:bg-slate-50 dark:border-slate-700"><ScanIcon /></button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input type="number" value={form.cost_price} onChange={(e) => upd('cost_price', e.target.value)} placeholder="Cost price" className={`${ic} font-mono`} />
          <input type="number" value={form.wholesale_price} onChange={(e) => upd('wholesale_price', e.target.value)} placeholder="Wholesale" className={`${ic} font-mono`} />
          <input type="number" value={form.retail_price} onChange={(e) => upd('retail_price', e.target.value)} placeholder="Retail price" className={`${ic} font-mono`} />
          <input type="number" value={form.mrp} onChange={(e) => upd('mrp', e.target.value)} placeholder="MRP" className={`${ic} font-mono`} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <select value={form.discount_type} onChange={(e) => upd('discount_type', e.target.value)} className={ic}>
            <option value="none">No discount</option>
            <option value="percentage">% discount</option>
            <option value="fixed">Fixed discount</option>
          </select>
          {form.discount_type !== 'none' && (
            <input type="number" value={form.discount_value} onChange={(e) => upd('discount_value', e.target.value)} placeholder="Discount value" className={`${ic} font-mono`} />
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input type="number" value={form.weight_grams} onChange={(e) => upd('weight_grams', e.target.value)} placeholder="Weight (grams)" className={ic} />
          <input type="number" value={form.low_stock_threshold} onChange={(e) => upd('low_stock_threshold', e.target.value)} placeholder="Low-stock threshold" className={ic} />
        </div>
        <div className="flex items-center gap-3">
          {form.image_url && <img src={form.image_url} alt="" className="h-12 w-12 rounded-lg border border-slate-200 object-cover dark:border-slate-700" />}
          <label className="cursor-pointer rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400">
            {uploading ? 'Uploading...' : form.image_url ? 'Change Image' : 'Upload Image'}
            <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => uploadImage(e.target.files[0])} />
          </label>
        </div>
        <PriceTierEditor tiers={priceTiers} onChange={setPriceTiers} />
        <button onClick={save} disabled={saving} className="w-full rounded-xl bg-brand-600 py-2.5 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-50">
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
      {scanOpen && <BarcodeScanner title="Scan barcode" hint="Scanned value fills the barcode field." onDetected={(code) => { upd('barcode', String(code).trim()); setScanOpen(false); }} onClose={() => setScanOpen(false)} />}
    </Drawer>
  );
}

function ConfirmDeleteModal({ item, onClose, onConfirm }) {
  const label = item.type === 'product' ? item.item.name : `${item.item.variant_label} (${item.item.sku})`;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60" onClick={onClose} />
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="relative mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
        <h3 className="text-base font-semibold text-slate-900 dark:text-white">Delete {item.type}?</h3>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          This will remove <strong>{label}</strong> permanently. If it has order history, it will be deactivated instead (hidden from billing/website but order history preserved).
        </p>
        <div className="mt-5 flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-xl border border-slate-200 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400">Cancel</button>
          <button onClick={onConfirm} className="flex-1 rounded-xl bg-red-600 py-2 text-sm font-medium text-white transition hover:bg-red-700">Delete</button>
        </div>
      </motion.div>
    </div>
  );
}

function AddProductForm({ categories, brands, onCreated, onError, onCatalogChange }) {
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [brandId, setBrandId] = useState('');
  const [description, setDescription] = useState('');
  const [lowThreshold, setLowThreshold] = useState(5);
  const [variants, setVariants] = useState([{ ...BLANK_VARIANT }]);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingIdx, setUploadingIdx] = useState(null);
  const [scanForIdx, setScanForIdx] = useState(null);
  const [newCategory, setNewCategory] = useState('');
  const [newBrand, setNewBrand] = useState('');
  const [productImages, setProductImages] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [selectedTagIds, setSelectedTagIds] = useState([]);

  useEffect(() => {
    client.get('/tags').then(r => setAllTags(r.data.data || [])).catch(() => {});
  }, []);

  function toggleTag(id) {
    setSelectedTagIds(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  }

  function updateVariant(idx, field, value) {
    setVariants((prev) => prev.map((v, i) => (i === idx ? { ...v, [field]: value } : v)));
  }

  const handleBarcodeScanned = useCallback((code) => {
    setScanForIdx((idx) => {
      if (idx !== null) {
        const value = String(code).trim();
        setVariants((prev) => prev.map((v, i) => (i === idx ? { ...v, barcode: value } : v)));
      }
      return null;
    });
  }, []);

  async function uploadImage(idx, file) {
    if (!file) return;
    setUploadingIdx(idx);
    onError('');
    try {
      const form = new FormData();
      form.append('image', file);
      const res = await client.post('/products/upload-image', form);
      updateVariant(idx, 'image_url', res.data.data.image_url);
    } catch (err) {
      onError(err.response?.data?.message ?? 'Image upload failed');
    } finally { setUploadingIdx(null); }
  }

  async function addCategory() {
    if (!newCategory.trim()) return;
    try {
      const res = await client.post('/catalog/categories', { name: newCategory.trim() });
      setNewCategory('');
      await onCatalogChange();
      setCategoryId(String(res.data.data.id));
    } catch (err) { onError(err.response?.data?.message ?? 'Could not add category'); }
  }

  async function addBrand() {
    if (!newBrand.trim()) return;
    try {
      const res = await client.post('/catalog/brands', { name: newBrand.trim() });
      setNewBrand('');
      await onCatalogChange();
      setBrandId(String(res.data.data.id));
    } catch (err) { onError(err.response?.data?.message ?? 'Could not add brand'); }
  }

  async function submit(e) {
    e.preventDefault();
    onError('');
    if (!categoryId) return onError('Select a category');
    if (!variants.every((v) => v.sku && v.variant_label)) return onError('Every variant needs at least a SKU and a label');
    setSubmitting(true);
    try {
      const res = await client.post('/products/full', {
        category_id: Number(categoryId), brand_id: brandId ? Number(brandId) : null, name, description,
        low_stock_threshold: Number(lowThreshold) || 5, tag_ids: selectedTagIds,
        variants: variants.map((v) => ({
          sku: v.sku, barcode: v.barcode || null, variant_label: v.variant_label, image_url: v.image_url || null,
          cost_price: Number(v.cost_price) || 0, wholesale_price: Number(v.wholesale_price) || 0,
          retail_price: Number(v.retail_price) || 0, mrp: v.mrp ? Number(v.mrp) : null,
          current_stock: Number(v.current_stock) || 0, low_stock_threshold: v.low_stock_threshold ? Number(v.low_stock_threshold) : null,
          price_tiers: (v.price_tiers || []).filter(t => t.min_quantity && t.tier_price).map(t => ({
            min_quantity: Number(t.min_quantity), tier_price: Number(t.tier_price), label: t.label || null,
          })),
        })),
      });
      if (productImages.length > 0 && res.data.id) {
        const pid = res.data.id;
        for (let i = 0; i < productImages.length; i++) {
          const img = productImages[i];
          await client.post(`/products/${pid}/images/url`, {
            image_url: img.image_url, sort_order: i, is_primary: i === 0,
          }).catch(() => {});
        }
      }
      onCreated();
    } catch (err) { onError(err.response?.data?.message ?? 'Could not create product'); }
    finally { setSubmitting(false); }
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input required placeholder="Product name" value={name} onChange={(e) => setName(e.target.value)} className={ic} />
        <input placeholder="Low-stock threshold (default 5)" type="number" value={lowThreshold} onChange={(e) => setLowThreshold(e.target.value)} className={ic} />
        <select required value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={ic}>
          <option value="">Category...</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={brandId} onChange={(e) => setBrandId(e.target.value)} className={ic}>
          <option value="">Brand (optional)...</option>
          {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <div className="flex gap-2">
          <input placeholder="Quick-add category" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className={`${ic} min-w-0 flex-1`} />
          <button type="button" onClick={addCategory} className="rounded-xl border border-slate-200 px-2.5 text-sm text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800">+</button>
        </div>
        <div className="flex gap-2">
          <input placeholder="Quick-add brand" value={newBrand} onChange={(e) => setNewBrand(e.target.value)} className={`${ic} min-w-0 flex-1`} />
          <button type="button" onClick={addBrand} className="rounded-xl border border-slate-200 px-2.5 text-sm text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800">+</button>
        </div>
      </div>
      <textarea placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} className={`${ic} w-full`} rows={2} />

      {allTags.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">Tags</p>
          <div className="flex flex-wrap gap-2">
            {allTags.map(t => (
              <button key={t.id} type="button" onClick={() => toggleTag(t.id)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  selectedTagIds.includes(t.id)
                    ? 'bg-brand-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}>{t.name}</button>
            ))}
          </div>
        </div>
      )}

      <MultiImageManager productId={null} images={productImages} onChange={setProductImages} />

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Variants</h3>
          <button type="button" onClick={() => setVariants((p) => [...p, { ...BLANK_VARIANT }])} className="text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">+ Add variant</button>
        </div>
        {variants.map((v, idx) => (
          <div key={idx} className="space-y-2 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Variant {idx + 1}</span>
              {variants.length > 1 && <button type="button" onClick={() => setVariants((p) => p.filter((_, i) => i !== idx))} className="text-slate-400 hover:text-red-500">✕</button>}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <input placeholder="Label (e.g. Size M)" value={v.variant_label} onChange={(e) => updateVariant(idx, 'variant_label', e.target.value)} className={ic} />
              <input placeholder="SKU" value={v.sku} onChange={(e) => updateVariant(idx, 'sku', e.target.value)} className={`${ic} font-mono`} />
              <div className="flex gap-1">
                <input placeholder="Barcode" value={v.barcode} onChange={(e) => updateVariant(idx, 'barcode', e.target.value)} className={`${ic} min-w-0 flex-1 font-mono`} />
                <button type="button" onClick={() => setScanForIdx(idx)} title="Scan barcode with camera"
                  className="flex shrink-0 items-center justify-center rounded-xl border border-slate-200 px-2 text-slate-500 transition hover:bg-slate-50 hover:text-brand-600 dark:border-slate-700 dark:hover:bg-slate-800"><ScanIcon /></button>
              </div>
              <input placeholder="Cost price" type="number" value={v.cost_price} onChange={(e) => updateVariant(idx, 'cost_price', e.target.value)} className={`${ic} font-mono`} />
              <input placeholder="Wholesale" type="number" value={v.wholesale_price} onChange={(e) => updateVariant(idx, 'wholesale_price', e.target.value)} className={`${ic} font-mono`} />
              <input placeholder="Retail price" type="number" value={v.retail_price} onChange={(e) => updateVariant(idx, 'retail_price', e.target.value)} className={`${ic} font-mono`} />
              <input placeholder="MRP" type="number" value={v.mrp} onChange={(e) => updateVariant(idx, 'mrp', e.target.value)} className={`${ic} font-mono`} />
              <input placeholder="Opening stock" type="number" value={v.current_stock} onChange={(e) => updateVariant(idx, 'current_stock', e.target.value)} className={ic} />
              <input placeholder="Low-stock override" type="number" value={v.low_stock_threshold} onChange={(e) => updateVariant(idx, 'low_stock_threshold', e.target.value)} className={ic} />
            </div>
            <div className="flex items-center gap-3">
              <label className="cursor-pointer rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800">
                {uploadingIdx === idx ? 'Uploading...' : v.image_url ? 'Change image' : 'Upload image'}
                <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => uploadImage(idx, e.target.files[0])} />
              </label>
              {v.image_url && <img src={v.image_url} alt="" className="h-9 w-9 rounded-lg border border-slate-200 object-cover dark:border-slate-700" />}
            </div>
            <PriceTierEditor tiers={v.price_tiers || []} onChange={(tiers) => updateVariant(idx, 'price_tiers', tiers)} />
          </div>
        ))}
      </div>

      <button type="submit" disabled={submitting}
        className="w-full rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 py-2.5 text-sm font-medium text-white shadow-md shadow-brand-500/20 transition hover:shadow-lg active:scale-[0.98] disabled:opacity-50">
        {submitting ? 'Saving...' : 'Create product'}
      </button>

      {scanForIdx !== null && <BarcodeScanner title={`Scan barcode — Variant ${scanForIdx + 1}`} hint="The scanned value fills the barcode field." onDetected={handleBarcodeScanned} onClose={() => setScanForIdx(null)} />}
    </form>
  );
}

function AdjustDrawer({ variant, onClose, onDone, onError }) {
  const [delta, setDelta] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit(sign) {
    const magnitude = Math.abs(Number(delta));
    if (!magnitude) return;
    setSubmitting(true);
    onError('');
    try {
      await client.post('/inventory/adjust', { variant_id: variant.variant_id, change_qty: sign * magnitude });
      onDone();
    } catch (err) { onError(err.response?.data?.message ?? 'Adjustment failed'); setSubmitting(false); }
  }

  return (
    <Drawer onClose={onClose} title="Adjust stock">
      <p className="mb-1 text-sm font-medium text-slate-900 dark:text-white">{variant.name}</p>
      <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">{variant.variant_label} · <span className="font-mono">{variant.sku}</span> · current <span className="font-mono font-medium">{variant.current_stock}</span></p>
      <input type="number" min="1" autoFocus placeholder="Quantity" value={delta} onChange={(e) => setDelta(e.target.value)}
        className="mb-4 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
      <div className="flex gap-3">
        <button disabled={submitting} onClick={() => submit(1)}
          className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-50">+ Add stock</button>
        <button disabled={submitting} onClick={() => submit(-1)}
          className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-medium text-white transition hover:bg-red-700 active:scale-[0.98] disabled:opacity-50">− Remove stock</button>
      </div>
    </Drawer>
  );
}

function HistoryDrawer({ variant, onClose }) {
  const [rows, setRows] = useState(null);
  useEffect(() => { client.get(`/inventory/movements/${variant.variant_id}`).then((res) => setRows(res.data.data)); }, [variant.variant_id]);

  return (
    <Drawer onClose={onClose} title="Stock history">
      <p className="mb-1 text-sm font-medium text-slate-900 dark:text-white">{variant.name}</p>
      <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">{variant.variant_label} · <span className="font-mono">{variant.sku}</span></p>
      {rows === null ? <p className="text-sm text-slate-400">Loading...</p> : rows.length === 0 ? (
        <EmptyState icon="📊" title="No movements" description="Stock changes will appear here" />
      ) : (
        <div className="space-y-2">
          {rows.map((m) => (
            <div key={m.id} className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2 text-sm dark:border-slate-800">
              <div>
                <span className={`font-mono font-medium ${m.change_qty >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                  {m.change_qty >= 0 ? '+' : ''}{m.change_qty}
                </span>
                <span className="ml-2 text-slate-500 dark:text-slate-400">{m.reason.replace(/_/g, ' ')}</span>
              </div>
              <div className="text-right text-xs text-slate-400">
                <div>{new Date(m.created_at).toLocaleString()}</div>
                {m.created_by_name && <div>{m.created_by_name}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </Drawer>
  );
}

function Drawer({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/40 dark:bg-black/60" onClick={onClose} />
      <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', stiffness: 400, damping: 35 }}
        className="relative flex w-full max-w-sm flex-col bg-white shadow-xl dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </motion.div>
    </div>
  );
}
