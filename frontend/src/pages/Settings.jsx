import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import client from '../api/client';
import { useToast } from '../context/ToastContext';
import PageWrapper from '../components/PageWrapper';
import { Skeleton } from '../components/Skeleton';

function money(n) { return `Rs. ${Number(n || 0).toFixed(2)}`; }

const FIELDS = [
  { key: 'store_name', label: 'Store name', type: 'text', required: true },
  { key: 'address_line1', label: 'Address line 1', type: 'text' },
  { key: 'address_line2', label: 'Address line 2', type: 'text' },
  { key: 'city', label: 'City', type: 'text' },
  { key: 'phone', label: 'Phone', type: 'text' },
  { key: 'email', label: 'Email', type: 'email' },
  { key: 'tax_id', label: 'Tax ID / Business Reg.', type: 'text' },
  { key: 'currency_symbol', label: 'Currency symbol', type: 'text', required: true },
  { key: 'receipt_footer', label: 'Receipt footer message', type: 'textarea' },
];

export default function Settings() {
  const toast = useToast();
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    client.get('/settings').then((res) => {
      setForm(res.data.data || {});
      setLoading(false);
    });
  }, []);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await client.put('/settings', form);
      setForm(res.data.data);
      toast.success('Settings saved');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleLogoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Logo must be under 2 MB');
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Only JPEG, PNG, or WebP allowed');
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('logo', file);
      const res = await client.post('/settings/logo', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setForm(res.data.data);
      toast.success('Logo updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const logoSrc = form.logo_url || null;

  if (loading) {
    return (
      <div className="flex h-full flex-col bg-slate-50 dark:bg-slate-950">
        <div className="mx-auto w-full max-w-lg p-6 space-y-4">
          {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      </div>
    );
  }

  return (
    <PageWrapper className="flex h-full flex-col bg-slate-50 dark:bg-slate-950">
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-lg">
          <h1 className="mb-1 text-lg font-semibold text-slate-900 dark:text-white">Store settings</h1>
          <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
            These details appear on printed and digital receipts.
          </p>

          {/* Logo upload section */}
          <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <label className="mb-3 block text-xs font-medium text-slate-600 dark:text-slate-400">Store logo</label>
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
                {logoSrc ? (
                  <img src={logoSrc} alt="Store logo" className="h-full w-full object-contain" />
                ) : (
                  <svg className="h-8 w-8 text-slate-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <path d="m21 15-5-5L5 21" />
                  </svg>
                )}
              </div>
              <div className="flex-1">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 active:scale-[0.98] disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  {uploading ? 'Uploading...' : logoSrc ? 'Change logo' : 'Upload logo'}
                </button>
                <p className="mt-1.5 text-xs text-slate-400">JPEG, PNG, or WebP. Max 2 MB.</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            {FIELDS.map((f) => (
              <div key={f.key}>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">{f.label}</label>
                {f.type === 'textarea' ? (
                  <textarea
                    value={form[f.key] || ''}
                    onChange={(e) => update(f.key, e.target.value)}
                    rows={2}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-brand-500"
                  />
                ) : (
                  <input
                    type={f.type}
                    required={f.required}
                    value={form[f.key] || ''}
                    onChange={(e) => update(f.key, e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-brand-500"
                  />
                )}
              </div>
            ))}

            <button type="submit" disabled={saving}
              className="w-full rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-500/20 transition-all hover:shadow-lg active:scale-[0.98] disabled:opacity-50">
              {saving ? 'Saving...' : 'Save settings'}
            </button>
          </form>
          <UserManagement />
          <DeliveryZones />
          <WeightTiers />
          <TagsManager />
          <DataManagement />
        </motion.div>
      </div>
    </PageWrapper>
  );
}

function DeliveryZones() {
  const toast = useToast();
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [baseFee, setBaseFee] = useState('');
  const [packFee, setPackFee] = useState('100');
  const [editing, setEditing] = useState(null);

  useEffect(() => { load(); }, []);
  async function load() {
    try { const r = await client.get('/delivery/zones'); setZones(r.data.data); }
    catch { toast.error('Failed to load zones'); }
    finally { setLoading(false); }
  }

  async function save() {
    if (!name.trim()) return;
    try {
      if (editing) {
        await client.put(`/delivery/zones/${editing}`, { zone_name: name.trim(), base_fee: Number(baseFee) || 0, per_additional_pack_fee: Number(packFee) || 100 });
        toast.success('Zone updated');
      } else {
        await client.post('/delivery/zones', { zone_name: name.trim(), base_fee: Number(baseFee) || 0, per_additional_pack_fee: Number(packFee) || 100 });
        toast.success('Zone added');
      }
      setName(''); setBaseFee(''); setPackFee('100'); setEditing(null); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  }

  async function remove(id) {
    try { await client.delete(`/delivery/zones/${id}`); toast.success('Zone deleted'); load(); }
    catch { toast.error('Delete failed'); }
  }

  function startEdit(z) { setEditing(z.id); setName(z.zone_name); setBaseFee(String(z.base_fee)); setPackFee(String(z.per_additional_pack_fee ?? 100)); }
  function cancelEdit() { setEditing(null); setName(''); setBaseFee(''); setPackFee('100'); }

  const ic = 'rounded-xl border border-slate-200 px-2.5 py-1.5 text-sm outline-none transition focus:border-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white';

  return (
    <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">Delivery Zones</h2>
      <div className="mb-3 flex gap-2">
        <input placeholder="Zone name" value={name} onChange={e => setName(e.target.value)} className={`${ic} flex-1`} />
        <input placeholder="Base fee" type="number" value={baseFee} onChange={e => setBaseFee(e.target.value)} className={`${ic} w-24 font-mono`} />
        <input placeholder="Per pack fee" type="number" value={packFee} onChange={e => setPackFee(e.target.value)} className={`${ic} w-24 font-mono`} title="Per additional pack fee" />
        <button onClick={save} className="rounded-xl bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 active:scale-[0.98]">
          {editing ? 'Update' : 'Add'}
        </button>
        {editing && <button onClick={cancelEdit} className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">Cancel</button>}
      </div>
      {loading ? <Skeleton className="h-20 w-full" /> : zones.length === 0 ? (
        <p className="text-sm text-slate-400">No delivery zones yet</p>
      ) : (
        <div className="space-y-1.5">
          {zones.map(z => (
            <div key={z.id} className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2 dark:border-slate-800">
              <div>
                <span className="text-sm text-slate-900 dark:text-white">{z.zone_name}</span>
                <span className="ml-2 font-mono text-xs text-slate-500 dark:text-slate-400">{money(z.base_fee)} + {money(z.per_additional_pack_fee ?? 100)}/extra pack</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => startEdit(z)} className="text-xs text-brand-600 hover:text-brand-700 dark:text-brand-400">Edit</button>
                <button onClick={() => remove(z.id)} className="text-xs text-red-500 hover:text-red-600">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function WeightTiers() {
  const toast = useToast();
  const [tiers, setTiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [minGrams, setMinGrams] = useState('');
  const [maxGrams, setMaxGrams] = useState('');
  const [surcharge, setSurcharge] = useState('');
  const [editing, setEditing] = useState(null);

  useEffect(() => { load(); }, []);
  async function load() {
    try { const r = await client.get('/delivery/weight-tiers'); setTiers(r.data.data); }
    catch { toast.error('Failed to load weight tiers'); }
    finally { setLoading(false); }
  }

  async function save() {
    try {
      const body = { min_weight_grams: Number(minGrams) || 0, max_weight_grams: Number(maxGrams) || 0, surcharge: Number(surcharge) || 0 };
      if (editing) {
        await client.put(`/delivery/weight-tiers/${editing}`, body);
        toast.success('Tier updated');
      } else {
        await client.post('/delivery/weight-tiers', body);
        toast.success('Tier added');
      }
      setMinGrams(''); setMaxGrams(''); setSurcharge(''); setEditing(null); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  }

  async function remove(id) {
    try { await client.delete(`/delivery/weight-tiers/${id}`); toast.success('Tier deleted'); load(); }
    catch { toast.error('Delete failed'); }
  }

  function startEdit(t) { setEditing(t.id); setMinGrams(String(t.min_weight_grams)); setMaxGrams(String(t.max_weight_grams)); setSurcharge(String(t.surcharge)); }
  function cancelEdit() { setEditing(null); setMinGrams(''); setMaxGrams(''); setSurcharge(''); }

  const ic = 'rounded-xl border border-slate-200 px-2.5 py-1.5 text-sm outline-none transition focus:border-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white';

  return (
    <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">Weight-based Surcharges</h2>
      <div className="mb-3 flex flex-wrap gap-2">
        <input placeholder="Min (g)" type="number" value={minGrams} onChange={e => setMinGrams(e.target.value)} className={`${ic} w-20 font-mono`} />
        <input placeholder="Max (g)" type="number" value={maxGrams} onChange={e => setMaxGrams(e.target.value)} className={`${ic} w-20 font-mono`} />
        <input placeholder="Surcharge" type="number" value={surcharge} onChange={e => setSurcharge(e.target.value)} className={`${ic} w-24 font-mono`} />
        <button onClick={save} className="rounded-xl bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 active:scale-[0.98]">
          {editing ? 'Update' : 'Add'}
        </button>
        {editing && <button onClick={cancelEdit} className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">Cancel</button>}
      </div>
      {loading ? <Skeleton className="h-20 w-full" /> : tiers.length === 0 ? (
        <p className="text-sm text-slate-400">No weight tiers yet</p>
      ) : (
        <div className="space-y-1.5">
          {tiers.map(t => (
            <div key={t.id} className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2 dark:border-slate-800">
              <span className="font-mono text-sm text-slate-700 dark:text-slate-300">{t.min_weight_grams}g – {t.max_weight_grams}g → +{money(t.surcharge)}</span>
              <div className="flex gap-2">
                <button onClick={() => startEdit(t)} className="text-xs text-brand-600 hover:text-brand-700 dark:text-brand-400">Edit</button>
                <button onClick={() => remove(t.id)} className="text-xs text-red-500 hover:text-red-600">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DataManagement() {
  const toast = useToast();
  const [exporting, setExporting] = useState('');
  const [importFile, setImportFile] = useState(null);
  const [importPreview, setImportPreview] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const importRef = useRef(null);

  function downloadCSV(rows, filename) {
    if (!rows.length) { toast.error('No data to export'); return; }
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(','), ...rows.map(r => headers.map(h => {
      const v = String(r[h] ?? '');
      return v.includes(',') || v.includes('"') || v.includes('\n') ? `"${v.replace(/"/g, '""')}"` : v;
    }).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }

  async function handleExport(type) {
    setExporting(type);
    try {
      const r = await client.get(`/insights/export/${type}`);
      downloadCSV(r.data.data, `${type}_${new Date().toISOString().split('T')[0]}.csv`);
      toast.success(`${type} exported`);
    } catch (err) { toast.error(err.response?.data?.message || 'Export failed'); }
    finally { setExporting(''); }
  }

  function parseCSV(text) {
    const lines = text.split('\n').filter(l => l.trim());
    if (lines.length < 2) return null;
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const vals = [];
      let current = '', inQuotes = false;
      for (const ch of lines[i]) {
        if (ch === '"') { inQuotes = !inQuotes; }
        else if (ch === ',' && !inQuotes) { vals.push(current.trim()); current = ''; }
        else { current += ch; }
      }
      vals.push(current.trim());
      const row = {};
      headers.forEach((h, j) => { row[h] = vals[j] || ''; });
      rows.push(row);
    }
    return { headers, rows };
  }

  function handleFileSelect(file) {
    if (!file) return;
    if (!file.name.endsWith('.csv')) { toast.error('Only CSV files allowed'); return; }
    setImportFile(file);
    setImportResult(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const parsed = parseCSV(e.target.result);
      if (!parsed || parsed.rows.length === 0) { toast.error('Could not parse CSV'); return; }
      setImportPreview(parsed);
    };
    reader.readAsText(file);
  }

  function handleDrop(e) {
    e.preventDefault(); setDragOver(false);
    handleFileSelect(e.dataTransfer.files[0]);
  }

  async function handleImport() {
    if (!importPreview) return;
    setImporting(true);
    try {
      const r = await client.post('/insights/import/products', { products: importPreview.rows });
      setImportResult(r.data);
      toast.success(`Imported ${r.data.imported} products`);
    } catch (err) { toast.error(err.response?.data?.message || 'Import failed'); }
    finally { setImporting(false); }
  }

  function resetImport() {
    setImportFile(null); setImportPreview(null); setImportResult(null);
    if (importRef.current) importRef.current.value = '';
  }

  const exports = [
    { type: 'products', label: 'Products', icon: '📦' },
    { type: 'customers', label: 'Customers', icon: '👥' },
    { type: 'orders', label: 'Orders', icon: '📋' },
  ];

  return (
    <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <h2 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">Data Management</h2>

      <div className="mb-5">
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">Export to CSV</h3>
        <div className="flex flex-wrap gap-2">
          {exports.map(ex => (
            <button key={ex.type} onClick={() => handleExport(ex.type)} disabled={!!exporting}
              className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 active:scale-[0.98] disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
              <span>{ex.icon}</span>
              {exporting === ex.type ? 'Exporting...' : `Export ${ex.label}`}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">Import Products from CSV</h3>
        <input ref={importRef} type="file" accept=".csv" onChange={e => handleFileSelect(e.target.files[0])} className="hidden" />

        {!importPreview ? (
          <div
            onClick={() => importRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 transition ${
              dragOver ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/10' : 'border-slate-200 hover:border-brand-400 dark:border-slate-700'
            }`}
          >
            <svg className="h-8 w-8 text-slate-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            <p className="text-sm text-slate-500 dark:text-slate-400">Drop CSV file here or click to browse</p>
            <p className="text-xs text-slate-400">Columns: name, sku, category, brand, cost_price, retail_price, current_stock</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-lg">📄</span>
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{importFile?.name}</p>
                  <p className="text-xs text-slate-400">{importPreview.rows.length} rows · {importPreview.headers.length} columns</p>
                </div>
              </div>
              <button onClick={resetImport} className="text-xs text-red-500 hover:text-red-600">Remove</button>
            </div>

            <div className="max-h-48 overflow-auto rounded-lg border border-slate-200 dark:border-slate-700">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800">
                    {importPreview.headers.slice(0, 7).map(h => (
                      <th key={h} className="px-2 py-1.5 text-left font-medium text-slate-500 dark:text-slate-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {importPreview.rows.slice(0, 5).map((row, i) => (
                    <tr key={i} className="border-t border-slate-100 dark:border-slate-800">
                      {importPreview.headers.slice(0, 7).map(h => (
                        <td key={h} className="px-2 py-1 text-slate-700 dark:text-slate-300">{row[h]}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {importPreview.rows.length > 5 && (
                <p className="px-2 py-1 text-center text-[10px] text-slate-400">...and {importPreview.rows.length - 5} more rows</p>
              )}
            </div>

            {importResult ? (
              <div className="rounded-lg bg-emerald-50 px-3 py-2 dark:bg-emerald-900/20">
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                  Imported {importResult.imported} products
                  {importResult.skipped > 0 && ` · ${importResult.skipped} skipped (duplicate SKU)`}
                </p>
                <button onClick={resetImport} className="mt-1 text-xs text-emerald-600 underline dark:text-emerald-400">Import another</button>
              </div>
            ) : (
              <button onClick={handleImport} disabled={importing}
                className="w-full rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 active:scale-[0.98] disabled:opacity-50">
                {importing ? 'Importing...' : `Import ${importPreview.rows.length} Products`}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const PERMISSION_DEFS = [
  { key: 'billing', label: 'Billing', desc: 'Can ring up sales and process payments' },
  { key: 'orders', label: 'Orders', desc: 'Can view order history and order details' },
  { key: 'inventory', label: 'Inventory', desc: 'Can view and manage products, stock adjustments' },
  { key: 'purchasing', label: 'Purchasing', desc: 'Can view and manage suppliers, purchase orders' },
  { key: 'customers', label: 'Customers', desc: 'Can view and manage customer records' },
  { key: 'reports', label: 'Reports', desc: 'Can view dashboard, analytics, all report pages' },
  { key: 'deliveries', label: 'Deliveries', desc: 'Can view and manage delivery page' },
  { key: 'settings', label: 'Settings', desc: 'Can access store settings, user management' },
  { key: 'refunds', label: 'Refunds', desc: 'Can process refunds and returns' },
];
const DEFAULT_CASHIER_PERMS = ['billing', 'orders'];

function UserManagement() {
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState({ full_name: '', username: '', password: '', phone: '', permissions: [...DEFAULT_CASHIER_PERMS] });
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    try { const r = await client.get('/users'); setUsers(r.data.data); }
    catch { toast.error('Failed to load users'); }
    finally { setLoading(false); }
  }

  function openAdd() {
    setEditingUser(null);
    setForm({ full_name: '', username: '', password: '', phone: '', permissions: [...DEFAULT_CASHIER_PERMS] });
    setShowForm(true);
  }

  function openEdit(u) {
    setEditingUser(u);
    setForm({ full_name: u.full_name, username: u.username, password: '', phone: u.phone || '', permissions: [...(u.permissions || [])] });
    setShowForm(true);
  }

  function togglePerm(key) {
    setForm(prev => {
      const perms = prev.permissions.includes(key)
        ? prev.permissions.filter(p => p !== key)
        : [...prev.permissions, key];
      return { ...prev, permissions: perms };
    });
  }

  async function handleSave() {
    if (!form.full_name.trim() || !form.username.trim()) {
      toast.error('Name and username are required');
      return;
    }
    if (!editingUser && !form.password) {
      toast.error('Password is required for new users');
      return;
    }
    setSaving(true);
    try {
      if (editingUser) {
        const body = { full_name: form.full_name, phone: form.phone || null };
        if (form.password) body.password = form.password;
        await client.put(`/users/${editingUser.id}`, body);
        await client.put(`/users/${editingUser.id}/permissions`, { permissions: form.permissions });
        toast.success('User updated');
      } else {
        await client.post('/users', {
          full_name: form.full_name,
          username: form.username,
          password: form.password,
          phone: form.phone || null,
          permissions: form.permissions,
        });
        toast.success('User created');
      }
      setShowForm(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSaving(false); }
  }

  async function toggleActive(u) {
    try {
      await client.put(`/users/${u.id}`, { is_active: !u.is_active });
      toast.success(u.is_active ? 'User deactivated' : 'User activated');
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  }

  const ic = 'w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-brand-500';

  return (
    <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">User Management</h2>
        <button onClick={openAdd}
          className="rounded-xl bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700 active:scale-[0.98]">
          + Add Cashier
        </button>
      </div>

      {loading ? <Skeleton className="h-20 w-full" /> : users.length === 0 ? (
        <p className="text-sm text-slate-400">No users yet</p>
      ) : (
        <div className="space-y-2">
          {users.map(u => (
            <div key={u.id} className={`rounded-xl border px-4 py-3 transition ${u.is_active ? 'border-slate-200 dark:border-slate-700' : 'border-red-200 bg-red-50/50 dark:border-red-900/30 dark:bg-red-900/5'}`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{u.full_name}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${u.role === 'owner' ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
                      {u.role}
                    </span>
                    {!u.is_active && <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-600 dark:bg-red-900/30 dark:text-red-400">Inactive</span>}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">@{u.username}{u.phone ? ` · ${u.phone}` : ''}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {(u.permissions || []).map(p => (
                      <span key={p} className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">{p}</span>
                    ))}
                  </div>
                </div>
                {u.role !== 'owner' && (
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(u)} className="text-xs text-brand-600 hover:text-brand-700 dark:text-brand-400">Edit</button>
                    <button onClick={() => toggleActive(u)} className={`text-xs ${u.is_active ? 'text-red-500 hover:text-red-600' : 'text-emerald-600 hover:text-emerald-700'}`}>
                      {u.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit form modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowForm(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="mx-4 max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-xl dark:bg-slate-900" onClick={e => e.stopPropagation()}>
              <h3 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">
                {editingUser ? `Edit — ${editingUser.full_name}` : 'Add New Cashier'}
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Full name *</label>
                  <input type="text" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} className={ic} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Username *</label>
                  <input type="text" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                    disabled={!!editingUser} className={`${ic} ${editingUser ? 'opacity-50' : ''}`} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                    Password {editingUser ? '(leave blank to keep current)' : '*'}
                  </label>
                  <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} className={ic} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Phone</label>
                  <input type="text" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className={ic} />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-medium text-slate-500 dark:text-slate-400">Permissions</label>
                  <div className="space-y-1.5">
                    {PERMISSION_DEFS.map(p => {
                      const isOwner = editingUser?.role === 'owner';
                      const checked = isOwner || form.permissions.includes(p.key);
                      return (
                        <label key={p.key}
                          className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 transition cursor-pointer ${
                            checked
                              ? 'border-brand-200 bg-brand-50 dark:border-brand-800 dark:bg-brand-900/10'
                              : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600'
                          } ${isOwner ? 'opacity-60 cursor-not-allowed' : ''}`}>
                          <input type="checkbox" checked={checked} disabled={isOwner}
                            onChange={() => !isOwner && togglePerm(p.key)}
                            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium ${checked ? 'text-brand-700 dark:text-brand-300' : 'text-slate-700 dark:text-slate-300'}`}>{p.label}</p>
                            <p className="text-xs text-slate-400">{p.desc}</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <button onClick={() => setShowForm(false)}
                  className="rounded-lg border border-slate-200 px-4 py-1.5 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">Cancel</button>
                <button onClick={handleSave} disabled={saving}
                  className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50">
                  {saving ? 'Saving...' : editingUser ? 'Update' : 'Create'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TagsManager() {
  const toast = useToast();
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newTag, setNewTag] = useState('');

  useEffect(() => { load(); }, []);
  async function load() {
    try { const r = await client.get('/tags'); setTags(r.data.data); }
    catch { toast.error('Failed to load tags'); }
    finally { setLoading(false); }
  }

  async function add() {
    if (!newTag.trim()) return;
    try {
      await client.post('/tags', { name: newTag.trim() });
      setNewTag(''); toast.success('Tag added'); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  }

  async function remove(id) {
    try { await client.delete(`/tags/${id}`); toast.success('Tag deleted'); load(); }
    catch { toast.error('Delete failed'); }
  }

  const ic = 'rounded-xl border border-slate-200 px-2.5 py-1.5 text-sm outline-none transition focus:border-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white';

  return (
    <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">Product Tags</h2>
      <div className="mb-3 flex gap-2">
        <input placeholder="New tag name" value={newTag} onChange={e => setNewTag(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()} className={`${ic} flex-1`} />
        <button onClick={add} className="rounded-xl bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 active:scale-[0.98]">Add</button>
      </div>
      {loading ? <Skeleton className="h-12 w-full" /> : tags.length === 0 ? (
        <p className="text-sm text-slate-400">No tags yet</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {tags.map(t => (
            <span key={t.id} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {t.name}
              <button onClick={() => remove(t.id)} className="text-slate-400 hover:text-red-500">&times;</button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
