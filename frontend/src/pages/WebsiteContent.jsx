import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import client from '../api/client';
import { useToast } from '../context/ToastContext';
import PageWrapper from '../components/PageWrapper';

const DEFAULTS = {
  hero: {
    badge: "Sri Lanka's #1 Diaper & Wipes Store",
    headline_1: 'Better Prices. Faster Delivery.',
    headline_2: 'Diapers. Wipes. Delivered.',
    subtitle: 'The best place in Sri Lanka to buy diapers and wet wipes. Genuine brands, unbeatable prices, always in stock.',
    cta_text: 'Shop Now',
    whatsapp_text: 'Chat on WhatsApp',
    delivery_msg: 'Free delivery on orders over Rs. 5,000',
  },
  promo_banners: {
    banners: [
      { text: 'Buy 2 Get 1 Free on Huggies this week!', icon: '🔥', cta: 'Shop Huggies', link: '/shop?brand=Huggies', color: 'orange' },
      { text: 'Free Delivery over Rs. 5,000!', icon: '🚚', cta: 'Start Shopping', link: '/shop', color: 'green' },
      { text: 'New: MamyPoko Extra Dry now in stock!', icon: '🎁', cta: 'View Now', link: '/shop?brand=MamyPoko', color: 'blue' },
    ],
  },
  categories: {
    items: [
      { name: 'Diapers', desc: 'Pants & tape-style, every size always in stock', brands: 'Pampers · Huggies · MamyPoko' },
      { name: 'Wet Wipes', desc: 'Baby wipes for every need — scented, unscented, travel', brands: 'Pigeon · Water Wipes · Huggies' },
      { name: 'Trending', desc: 'Cute finds and gifting essentials parents love', brands: 'Seasonal picks · Gifts · Accessories' },
    ],
  },
  stats: {
    items: [
      { value: '500+', label: 'Happy Parents' },
      { value: '10,000+', label: 'Packs Delivered' },
      { value: '24hr', label: 'Fast Delivery' },
      { value: '100%', label: 'Genuine Products' },
    ],
  },
  brand_story: {
    title: 'Why Parents Choose Littora',
    paragraph_1: "We started Littora because we noticed Sri Lankan parents were paying too much for diapers. As parents ourselves, we knew there had to be a better way — genuine products at fair prices, delivered right to your doorstep.",
    paragraph_2: "Today, we're trusted by hundreds of families across the island. We work directly with authorized distributors to guarantee every product is 100% genuine — no fakes, no expired stock, no compromises on your baby's comfort.",
  },
  testimonials: {
    items: [
      { quote: "Best prices for Huggies in Sri Lanka. Delivery was super fast — ordered at 10am and got it by 3pm the same day!", name: 'Amaya Perera', city: 'Colombo 05', stars: 5 },
      { quote: "මාසයක් පාසා order කරනවා. සැමවිටම genuine products, කවදාවත් disappoint වෙලා නෑ. Highly recommend! 💯", name: 'Sanduni Fernando', city: 'Nugegoda', stars: 5 },
      { quote: "Love how easy it is to reorder through WhatsApp! The team remembers my usual order. Personal service you won't find anywhere else.", name: 'Nimesha Silva', city: 'Galle', stars: 5 },
    ],
  },
  cta_banner: {
    badge: 'Limited Time Offers',
    headline: 'Ready to Stock Up?',
    subtitle: 'Free delivery on orders over Rs. 5,000. Buy 2 Get 1 Free on selected brands!',
  },
  footer: {
    phone: '+94 77 123 4567',
    email: 'hello@littoradiapers.com',
    address: 'Colombo, Sri Lanka',
    facebook: '#',
    instagram: '#',
    whatsapp: '94771234567',
  },
  announcement_bar: {
    text: 'Buy 2 Get 1 FREE!',
    enabled: true,
  },
};

function SectionCard({ title, icon, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition">
        <div className="flex items-center gap-3">
          <span className="text-xl">{icon}</span>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-white">{title}</h3>
        </div>
        <svg className={`h-5 w-5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-slate-100 px-5 py-4 dark:border-slate-800">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Field({ label, value, onChange, multiline, placeholder }) {
  const cls = 'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white';
  return (
    <div className="mb-3">
      <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">{label}</label>
      {multiline ? (
        <textarea value={value} onChange={e => onChange(e.target.value)} className={cls + ' min-h-[80px]'} placeholder={placeholder} />
      ) : (
        <input type="text" value={value} onChange={e => onChange(e.target.value)} className={cls} placeholder={placeholder} />
      )}
    </div>
  );
}

export default function WebsiteContent() {
  const toast = useToast();
  const [content, setContent] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});

  useEffect(() => {
    client.get('/settings/content').then(r => {
      const data = r.data.data || {};
      const merged = {};
      for (const key of Object.keys(DEFAULTS)) {
        merged[key] = { ...DEFAULTS[key], ...(data[key] || {}) };
        if (DEFAULTS[key].items && data[key]?.items) merged[key].items = data[key].items;
        if (DEFAULTS[key].banners && data[key]?.banners) merged[key].banners = data[key].banners;
      }
      setContent(merged);
    }).catch(() => {
      setContent({ ...DEFAULTS });
    }).finally(() => setLoading(false));
  }, []);

  async function saveSection(key) {
    setSaving(s => ({ ...s, [key]: true }));
    try {
      await client.put(`/settings/content/${key}`, { content: content[key] });
      toast.success(`${key.replace(/_/g, ' ')} saved`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(s => ({ ...s, [key]: false }));
    }
  }

  function update(section, field, value) {
    setContent(prev => ({
      ...prev,
      [section]: { ...prev[section], [field]: value },
    }));
  }

  function updateArrayItem(section, arrayKey, index, field, value) {
    setContent(prev => {
      const arr = [...(prev[section]?.[arrayKey] || [])];
      arr[index] = { ...arr[index], [field]: value };
      return { ...prev, [section]: { ...prev[section], [arrayKey]: arr } };
    });
  }

  function addArrayItem(section, arrayKey, template) {
    setContent(prev => {
      const arr = [...(prev[section]?.[arrayKey] || []), template];
      return { ...prev, [section]: { ...prev[section], [arrayKey]: arr } };
    });
  }

  function removeArrayItem(section, arrayKey, index) {
    setContent(prev => {
      const arr = (prev[section]?.[arrayKey] || []).filter((_, i) => i !== index);
      return { ...prev, [section]: { ...prev[section], [arrayKey]: arr } };
    });
  }

  function moveArrayItem(section, arrayKey, from, to) {
    if (to < 0) return;
    setContent(prev => {
      const arr = [...(prev[section]?.[arrayKey] || [])];
      if (to >= arr.length) return prev;
      const [item] = arr.splice(from, 1);
      arr.splice(to, 0, item);
      return { ...prev, [section]: { ...prev[section], [arrayKey]: arr } };
    });
  }

  const btnCls = 'rounded-lg bg-brand-600 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50 transition';

  if (loading) {
    return (
      <PageWrapper className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </PageWrapper>
    );
  }

  const c = content;

  return (
    <PageWrapper className="h-full overflow-y-auto bg-slate-50 dark:bg-slate-950">
      <div className="mx-auto max-w-3xl px-4 py-6 lg:px-6">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Website Content</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Edit text, banners, and testimonials that appear on your website.</p>
        </div>

        <div className="space-y-3">
          {/* Hero */}
          <SectionCard title="Hero Section" icon="🏠" defaultOpen>
            <Field label="Badge text" value={c.hero?.badge || ''} onChange={v => update('hero', 'badge', v)} />
            <Field label="Headline line 1" value={c.hero?.headline_1 || ''} onChange={v => update('hero', 'headline_1', v)} />
            <Field label="Headline line 2" value={c.hero?.headline_2 || ''} onChange={v => update('hero', 'headline_2', v)} />
            <Field label="Subtitle" value={c.hero?.subtitle || ''} onChange={v => update('hero', 'subtitle', v)} multiline />
            <Field label="CTA button text" value={c.hero?.cta_text || ''} onChange={v => update('hero', 'cta_text', v)} />
            <Field label="Delivery message" value={c.hero?.delivery_msg || ''} onChange={v => update('hero', 'delivery_msg', v)} />
            <button onClick={() => saveSection('hero')} disabled={saving.hero} className={btnCls}>
              {saving.hero ? 'Saving...' : 'Save Hero'}
            </button>
          </SectionCard>

          {/* Promo Banners */}
          <SectionCard title="Promo Banners" icon="📣">
            {(c.promo_banners?.banners || []).map((b, i) => (
              <div key={i} className="mb-4 rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-500">Banner {i + 1}</span>
                  <div className="flex gap-1">
                    <button onClick={() => moveArrayItem('promo_banners', 'banners', i, i - 1)} disabled={i === 0} className="rounded p-1 text-slate-400 hover:bg-slate-200 disabled:opacity-30 dark:hover:bg-slate-700">↑</button>
                    <button onClick={() => moveArrayItem('promo_banners', 'banners', i, i + 1)} disabled={i === (c.promo_banners?.banners?.length || 0) - 1} className="rounded p-1 text-slate-400 hover:bg-slate-200 disabled:opacity-30 dark:hover:bg-slate-700">↓</button>
                    <button onClick={() => removeArrayItem('promo_banners', 'banners', i)} className="rounded p-1 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">✕</button>
                  </div>
                </div>
                <Field label="Text" value={b.text} onChange={v => updateArrayItem('promo_banners', 'banners', i, 'text', v)} />
                <div className="grid grid-cols-3 gap-2">
                  <Field label="Icon" value={b.icon} onChange={v => updateArrayItem('promo_banners', 'banners', i, 'icon', v)} />
                  <Field label="CTA" value={b.cta} onChange={v => updateArrayItem('promo_banners', 'banners', i, 'cta', v)} />
                  <Field label="Link" value={b.link} onChange={v => updateArrayItem('promo_banners', 'banners', i, 'link', v)} />
                </div>
              </div>
            ))}
            <div className="flex gap-2">
              <button onClick={() => addArrayItem('promo_banners', 'banners', { text: '', icon: '🎉', cta: 'Shop Now', link: '/shop', color: 'blue' })}
                className="rounded-lg border border-dashed border-slate-300 px-3 py-2 text-xs font-medium text-slate-500 hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800">
                + Add Banner
              </button>
              <button onClick={() => saveSection('promo_banners')} disabled={saving.promo_banners} className={btnCls}>
                {saving.promo_banners ? 'Saving...' : 'Save Banners'}
              </button>
            </div>
          </SectionCard>

          {/* Categories */}
          <SectionCard title="Category Cards" icon="📁">
            {(c.categories?.items || []).map((cat, i) => (
              <div key={i} className="mb-3 rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
                <Field label={`Category ${i + 1} name`} value={cat.name} onChange={v => updateArrayItem('categories', 'items', i, 'name', v)} />
                <Field label="Description" value={cat.desc} onChange={v => updateArrayItem('categories', 'items', i, 'desc', v)} />
                <Field label="Brands" value={cat.brands} onChange={v => updateArrayItem('categories', 'items', i, 'brands', v)} />
              </div>
            ))}
            <button onClick={() => saveSection('categories')} disabled={saving.categories} className={btnCls}>
              {saving.categories ? 'Saving...' : 'Save Categories'}
            </button>
          </SectionCard>

          {/* Stats */}
          <SectionCard title="Stats Numbers" icon="📊">
            {(c.stats?.items || []).map((stat, i) => (
              <div key={i} className="mb-2 grid grid-cols-2 gap-2">
                <Field label={`Value ${i + 1}`} value={stat.value} onChange={v => updateArrayItem('stats', 'items', i, 'value', v)} />
                <Field label="Label" value={stat.label} onChange={v => updateArrayItem('stats', 'items', i, 'label', v)} />
              </div>
            ))}
            <button onClick={() => saveSection('stats')} disabled={saving.stats} className={btnCls}>
              {saving.stats ? 'Saving...' : 'Save Stats'}
            </button>
          </SectionCard>

          {/* Brand Story */}
          <SectionCard title="Brand Story" icon="📖">
            <Field label="Title" value={c.brand_story?.title || ''} onChange={v => update('brand_story', 'title', v)} />
            <Field label="Paragraph 1" value={c.brand_story?.paragraph_1 || ''} onChange={v => update('brand_story', 'paragraph_1', v)} multiline />
            <Field label="Paragraph 2" value={c.brand_story?.paragraph_2 || ''} onChange={v => update('brand_story', 'paragraph_2', v)} multiline />
            <button onClick={() => saveSection('brand_story')} disabled={saving.brand_story} className={btnCls}>
              {saving.brand_story ? 'Saving...' : 'Save Brand Story'}
            </button>
          </SectionCard>

          {/* Testimonials */}
          <SectionCard title="Testimonials" icon="⭐">
            {(c.testimonials?.items || []).map((t, i) => (
              <div key={i} className="mb-4 rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-500">Testimonial {i + 1}</span>
                  <button onClick={() => removeArrayItem('testimonials', 'items', i)} className="rounded p-1 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">✕</button>
                </div>
                <Field label="Quote" value={t.quote} onChange={v => updateArrayItem('testimonials', 'items', i, 'quote', v)} multiline />
                <div className="grid grid-cols-3 gap-2">
                  <Field label="Name" value={t.name} onChange={v => updateArrayItem('testimonials', 'items', i, 'name', v)} />
                  <Field label="City" value={t.city} onChange={v => updateArrayItem('testimonials', 'items', i, 'city', v)} />
                  <Field label="Stars (1-5)" value={String(t.stars || 5)} onChange={v => updateArrayItem('testimonials', 'items', i, 'stars', Math.min(5, Math.max(1, parseInt(v) || 5)))} />
                </div>
              </div>
            ))}
            <div className="flex gap-2">
              <button onClick={() => addArrayItem('testimonials', 'items', { quote: '', name: '', city: '', stars: 5 })}
                className="rounded-lg border border-dashed border-slate-300 px-3 py-2 text-xs font-medium text-slate-500 hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800">
                + Add Testimonial
              </button>
              <button onClick={() => saveSection('testimonials')} disabled={saving.testimonials} className={btnCls}>
                {saving.testimonials ? 'Saving...' : 'Save Testimonials'}
              </button>
            </div>
          </SectionCard>

          {/* CTA Banner */}
          <SectionCard title="CTA Banner" icon="🎯">
            <Field label="Badge text" value={c.cta_banner?.badge || ''} onChange={v => update('cta_banner', 'badge', v)} />
            <Field label="Headline" value={c.cta_banner?.headline || ''} onChange={v => update('cta_banner', 'headline', v)} />
            <Field label="Subtitle" value={c.cta_banner?.subtitle || ''} onChange={v => update('cta_banner', 'subtitle', v)} multiline />
            <button onClick={() => saveSection('cta_banner')} disabled={saving.cta_banner} className={btnCls}>
              {saving.cta_banner ? 'Saving...' : 'Save CTA Banner'}
            </button>
          </SectionCard>

          {/* Footer */}
          <SectionCard title="Footer" icon="📋">
            <Field label="Phone" value={c.footer?.phone || ''} onChange={v => update('footer', 'phone', v)} />
            <Field label="Email" value={c.footer?.email || ''} onChange={v => update('footer', 'email', v)} />
            <Field label="Address" value={c.footer?.address || ''} onChange={v => update('footer', 'address', v)} />
            <Field label="WhatsApp number (digits only)" value={c.footer?.whatsapp || ''} onChange={v => update('footer', 'whatsapp', v)} />
            <Field label="Facebook URL" value={c.footer?.facebook || ''} onChange={v => update('footer', 'facebook', v)} />
            <Field label="Instagram URL" value={c.footer?.instagram || ''} onChange={v => update('footer', 'instagram', v)} />
            <button onClick={() => saveSection('footer')} disabled={saving.footer} className={btnCls}>
              {saving.footer ? 'Saving...' : 'Save Footer'}
            </button>
          </SectionCard>

          {/* Announcement Bar */}
          <SectionCard title="Announcement Bar" icon="📢">
            <Field label="Announcement text" value={c.announcement_bar?.text || ''} onChange={v => update('announcement_bar', 'text', v)} />
            <div className="mb-3 flex items-center gap-2">
              <input
                type="checkbox"
                checked={c.announcement_bar?.enabled !== false}
                onChange={e => update('announcement_bar', 'enabled', e.target.checked)}
                className="rounded border-slate-300"
              />
              <label className="text-xs text-slate-600 dark:text-slate-400">Show announcement bar</label>
            </div>
            <button onClick={() => saveSection('announcement_bar')} disabled={saving.announcement_bar} className={btnCls}>
              {saving.announcement_bar ? 'Saving...' : 'Save Announcement'}
            </button>
          </SectionCard>
        </div>
      </div>
    </PageWrapper>
  );
}
