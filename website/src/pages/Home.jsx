import { useEffect, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { ArrowRight, ChevronLeft, ChevronRight, ShieldCheck, Truck, BadgePercent, Star, Quote, Heart, Package, Clock, Award, Pause, Play } from 'lucide-react';
import api from '../api/client';
import ProductCard from '../components/ProductCard';
import SEO from '../components/SEO';
import { useContent } from '../context/ContentContext';

/* ═══ Utilities ═══ */

function AnimatedCounter({ target, suffix = '', label, decimal = false }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    const duration = 2000;
    const steps = duration / 16;
    let frame = 0;
    const ease = (t) => 1 - Math.pow(1 - t, 3);
    const timer = setInterval(() => {
      frame++;
      const progress = ease(frame / steps);
      if (frame >= steps) { setCount(target); clearInterval(timer); }
      else setCount(decimal ? Math.round(target * progress * 10) / 10 : Math.floor(target * progress));
    }, 16);
    return () => clearInterval(timer);
  }, [isInView, target, decimal]);

  return (
    <div ref={ref} className="text-center">
      <div className="font-mono text-2xl font-bold bg-gradient-to-r from-primary-500 to-teal-500 bg-clip-text text-transparent sm:text-4xl lg:text-5xl">
        {decimal ? count.toFixed(1) : count.toLocaleString()}{suffix}
      </div>
      <p className="mt-2 text-sm text-slate-500 font-medium">{label}</p>
    </div>
  );
}

/* ═══ Floating Baby Decorations ═══ */
function BabyDecorations() {
  const icons = [
    { x: '3%', y: '20%', size: 18, delay: 0, dur: 20, label: '✨' },
    { x: '95%', y: '30%', size: 22, delay: 3, dur: 18, label: '🍼' },
    { x: '90%', y: '75%', size: 16, delay: 1, dur: 22, label: '⭐' },
  ];

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {icons.map((icon, i) => (
        <motion.div
          key={i}
          className="absolute select-none"
          style={{ left: icon.x, top: icon.y }}
          animate={{ y: [0, -15, 0, 10, 0], rotate: [0, 5, 0, -5, 0] }}
          transition={{ duration: icon.dur, repeat: Infinity, ease: 'easeInOut', delay: icon.delay }}
        >
          <span className="opacity-[0.08] text-slate-900" style={{ fontSize: icon.size }}>{icon.label}</span>
        </motion.div>
      ))}
    </div>
  );
}

/* ═══ Hero Slides Data ═══ */
const HERO_SLIDES = [
  { headline: 'Keeping Babies Dry, Happy, and Comfortable', cta: 'Shop Now', ctaLink: '/shop', focus: 'center 25%' },
  { headline: 'Gentle Protection, Pure Comfort', cta: 'Browse Products', ctaLink: '/shop', focus: 'center 30%' },
  { headline: 'Wrap Your Baby in Comfort', cta: 'Shop Diapers', ctaLink: '/shop?category=Diapers', focus: 'center 20%' },
  { headline: 'Soft on Skin, Tough on Mess', cta: 'Shop Wipes', ctaLink: '/shop?category=Wipes', focus: 'center 35%' },
  { headline: 'Trusted by 500+ Sri Lankan Parents', cta: 'Order via WhatsApp 💬', ctaLink: null, focus: 'center 30%' },
  { headline: 'Premium Brands, Best Prices, Delivered', cta: 'Free Delivery Over Rs. 5,000 🚚', ctaLink: '/shop', focus: 'center center' },
];

/* ═══ Hero Slider ═══ */
function HeroSlider({ whatsapp }) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef(null);
  const total = HERO_SLIDES.length;

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!paused) {
      timerRef.current = setInterval(() => setCurrent(c => (c + 1) % total), 5000);
    }
  }, [paused, total]);

  useEffect(() => {
    resetTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [resetTimer]);

  const goTo = (idx) => { setCurrent(idx); resetTimer(); };
  const prev = () => goTo((current - 1 + total) % total);
  const next = () => goTo((current + 1) % total);

  const slide = HERO_SLIDES[current];
  const whatsappHref = `https://wa.me/${whatsapp || '94771234567'}?text=Hi!%20I'd%20like%20to%20order`;

  return (
    <section className="relative h-[100dvh] min-h-[600px] w-full overflow-hidden -mt-[108px]">
      {/* Background slides with Ken Burns */}
      <AnimatePresence mode="sync">
        <motion.div
          key={current}
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1.2 }}
          exit={{ opacity: 0 }}
          transition={{
            opacity: { duration: 1.2, ease: 'easeInOut' },
            scale: { duration: 12, ease: 'linear' },
          }}
          className="absolute inset-0"
        >
          <img src={`/images/hero/slide-${current + 1}.jpg`} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: slide.focus }} />
        </motion.div>
      </AnimatePresence>

      {/* Soft mint/sage overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#0a2e1f]/60 via-[#0a2e1f]/35 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a2e1f]/50 via-transparent to-[#0a2e1f]/20" />

      {/* Content */}
      <div className="relative z-10 flex h-full items-center">
        <div className="mx-auto w-full max-w-7xl px-6 lg:px-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={current}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="max-w-2xl"
            >
              <h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-white drop-shadow-lg sm:text-5xl lg:text-6xl xl:text-7xl">
                {slide.headline}
              </h1>
              <div className="mt-8 flex flex-wrap gap-4">
                {slide.ctaLink ? (
                  <Link
                    to={slide.ctaLink}
                    className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-white px-8 py-4 text-base font-semibold text-slate-900 shadow-2xl transition-all hover:shadow-white/30 active:scale-[0.97]"
                  >
                    <span className="relative z-10 flex items-center gap-2">
                      {slide.cta} <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                    </span>
                    <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-primary-100/0 via-primary-100 to-primary-100/0 transition-transform duration-500 group-hover:translate-x-full" />
                  </Link>
                ) : (
                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex items-center gap-2 rounded-full bg-[#25D366] px-8 py-4 text-base font-semibold text-white shadow-2xl shadow-[#25D366]/30 transition-all hover:bg-[#20bd5a] active:scale-[0.97]"
                  >
                    {slide.cta} <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </a>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Navigation arrows */}
      <button
        onClick={prev}
        className="absolute left-4 top-1/2 z-20 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-all hover:bg-white/25 sm:left-6"
        aria-label="Previous slide"
      >
        <ChevronLeft className="h-6 w-6" />
      </button>
      <button
        onClick={next}
        className="absolute right-4 top-1/2 z-20 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-all hover:bg-white/25 sm:right-6"
        aria-label="Next slide"
      >
        <ChevronRight className="h-6 w-6" />
      </button>

      {/* Bottom controls: dots + pause */}
      <div className="absolute bottom-8 left-1/2 z-20 flex -translate-x-1/2 items-center gap-3">
        <div className="flex items-center gap-2">
          {HERO_SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-label={`Go to slide ${i + 1}`}
              className="group relative h-2.5 overflow-hidden rounded-full transition-all duration-500"
              style={{ width: i === current ? 32 : 10 }}
            >
              <div className="absolute inset-0 rounded-full bg-white/30" />
              {i === current && (
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: paused ? 99999 : 5, ease: 'linear' }}
                  className="absolute inset-0 origin-left rounded-full bg-white"
                />
              )}
              {i !== current && (
                <div className="absolute inset-0 rounded-full transition-colors group-hover:bg-white/60" />
              )}
            </button>
          ))}
        </div>
        <button
          onClick={() => setPaused(p => !p)}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-all hover:bg-white/25"
          aria-label={paused ? 'Play slideshow' : 'Pause slideshow'}
        >
          {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
        className="absolute bottom-24 left-1/2 -translate-x-1/2 z-10 sm:bottom-20"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="flex flex-col items-center gap-2 text-white/50"
        >
          <span className="text-[10px] font-medium tracking-[0.2em] uppercase">Scroll</span>
          <div className="h-8 w-5 rounded-full border-2 border-white/30 p-0.5">
            <motion.div
              animate={{ y: [0, 12, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="h-1.5 w-1.5 rounded-full bg-white/60"
            />
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}

/* ═══ Promo Carousel ═══ */
const GRADIENT_MAP = {
  orange: 'from-orange-500 via-red-500 to-pink-500',
  green: 'from-emerald-500 via-teal-500 to-cyan-500',
  blue: 'from-blue-500 via-indigo-500 to-violet-500',
  red: 'from-red-500 via-rose-500 to-pink-500',
  purple: 'from-purple-500 via-violet-500 to-indigo-500',
  pink: 'from-pink-500 via-rose-500 to-red-500',
};

function PromoCarousel({ banners }) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => setCurrent(c => (c + 1) % banners.length), 5000);
    return () => clearInterval(timer);
  }, [banners.length]);

  if (!banners.length) return null;

  const slide = banners[current];
  const gradient = GRADIENT_MAP[slide.color] || GRADIENT_MAP.orange;

  return (
    <section className="py-8 lg:py-12">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={current}
              initial={{ opacity: 0, x: 80 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -80 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className={`relative overflow-hidden rounded-3xl bg-gradient-to-r ${gradient} p-8 sm:p-12`}
            >
              <div className="absolute inset-0 animate-diagonal-lines" />
              <div className="absolute -top-16 -right-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
              <div className="absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" />

              <div className="relative z-10 flex flex-col items-center text-center sm:flex-row sm:text-left sm:justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-4xl sm:text-5xl">{slide.icon}</span>
                  <div>
                    <p className="text-xl font-bold text-white sm:text-2xl lg:text-3xl">{slide.text}</p>
                  </div>
                </div>
                <Link
                  to={slide.link || '/shop'}
                  className="mt-4 sm:mt-0 inline-flex items-center gap-2 rounded-full bg-white/20 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/30 hover:gap-3 shrink-0"
                >
                  {slide.cta} <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 z-20">
            {banners.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`h-2 rounded-full transition-all duration-300 ${i === current ? 'w-6 bg-white' : 'w-2 bg-white/40'}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══ Category Emojis & Gradients ═══ */
const CAT_STYLES = [
  { emoji: '🧷', gradient: 'from-sky-500 to-indigo-600', enterDir: -60 },
  { emoji: '🧻', gradient: 'from-emerald-400 to-emerald-600', enterDir: 0 },
  { emoji: '✨', gradient: 'from-pink-400 to-rose-500', enterDir: 60 },
];

/* ═══ Why Littora Section ═══ */
const STAT_ICONS = [Heart, Package, Clock, Award];
const STAT_COLORS = ['text-rose-500', 'text-primary-500', 'text-emerald-500', 'text-amber-500'];

function WhyLittora({ statsItems, story }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section ref={ref} className="relative py-20 lg:py-28 overflow-hidden">
      <BabyDecorations />
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-20 items-center">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="relative"
          >
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary-50 via-teal-50 to-sky-50" />
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary-500/5 via-transparent to-teal-500/5" />
            <div className="relative grid grid-cols-2 gap-4 p-8 lg:p-10">
              {statsItems.map((stat, i) => {
                const Icon = STAT_ICONS[i % STAT_ICONS.length];
                return (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 20, scale: 0.9 }}
                    animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
                    transition={{ delay: 0.2 + i * 0.1, type: 'spring', stiffness: 100 }}
                    className="rounded-2xl bg-white/80 p-5 shadow-sm backdrop-blur-sm border border-white/60"
                  >
                    <Icon className={`h-7 w-7 ${STAT_COLORS[i % STAT_COLORS.length]} mb-3`} />
                    <p className="text-2xl font-bold text-slate-900 lg:text-3xl">{stat.value}</p>
                    <p className="text-xs font-medium text-slate-500 mt-1">{stat.label}</p>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="inline-flex items-center gap-2 rounded-full bg-primary-50 px-4 py-1.5 text-xs font-semibold text-primary-600 uppercase tracking-wider mb-4">
              <ShieldCheck className="h-3.5 w-3.5" /> Our Story
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              {story.title?.replace('Littora', '').trim()}{' '}
              <span className="bg-gradient-to-r from-primary-500 to-teal-500 bg-clip-text text-transparent">Littora</span>
            </h2>
            <p className="mt-4 text-base leading-relaxed text-slate-600">
              {story.paragraph_1}
            </p>
            <p className="mt-3 text-base leading-relaxed text-slate-600">
              {story.paragraph_2}
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                </div>
                <span className="text-sm font-medium text-slate-700">Authorized Distributor</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100">
                  <Truck className="h-4 w-4 text-primary-600" />
                </div>
                <span className="text-sm font-medium text-slate-700">Island-wide Delivery</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100">
                  <BadgePercent className="h-4 w-4 text-amber-600" />
                </div>
                <span className="text-sm font-medium text-slate-700">Best Prices Guaranteed</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ═══ MAIN COMPONENT ═══ */

export default function Home() {
  const content = useContent();
  const [bestSellers, setBestSellers] = useState([]);
  const [newArrivals, setNewArrivals] = useState([]);
  const [blogPosts, setBlogPosts] = useState([]);
  const carouselRef = useRef(null);

  const promoBanners = content.promo_banners?.banners || [];
  const categories = content.categories?.items || [];
  const statsItems = content.stats?.items || [];
  const story = content.brand_story;
  const testimonials = content.testimonials?.items || [];
  const cta = content.cta_banner;
  const footer = content.footer;

  useEffect(() => {
    api.get('/best-sellers').then(r => setBestSellers(r.data.data)).catch(() => {});
    api.get('/new-arrivals?limit=8').then(r => setNewArrivals(r.data.data)).catch(() => {});
    api.get('/blog?limit=3').then(r => setBlogPosts(r.data.data.posts)).catch(() => {});
  }, []);

  const scrollCarousel = useCallback((dir) => {
    const el = carouselRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * 300, behavior: 'smooth' });
  }, []);

  const blogPlaceholder = 'data:image/svg+xml,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect fill="#f0f9ff" width="600" height="400"/><text x="300" y="200" text-anchor="middle" font-family="system-ui" font-size="18" fill="#bae6fd">Blog Cover</text></svg>'
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <SEO path="/" description="Premium baby diapers and wipes delivered across Sri Lanka" />

      {/* ═══════════════════ HERO SLIDER ═══════════════════ */}
      <HeroSlider whatsapp={footer?.whatsapp} />

      {/* ═══════════════════ PROMO CAROUSEL ═══════════════════ */}
      <PromoCarousel banners={promoBanners} />

      {/* ═══════════════════ WHAT WE SELL ═══════════════════ */}
      <section className="py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="text-center">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl"
            >
              What We Sell
            </motion.h2>
            <div className="mx-auto mt-3 h-1 w-12 rounded-full bg-gradient-to-r from-primary-400 to-teal-400" />
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-3">
            {categories.map((cat, i) => {
              const style = CAT_STYLES[i % CAT_STYLES.length];
              return (
                <motion.div
                  key={cat.name}
                  initial={{ opacity: 0, x: style.enterDir, scale: 0.95 }}
                  whileInView={{ opacity: 1, x: 0, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, type: 'spring', stiffness: 80, damping: 20 }}
                >
                  <Link
                    to={`/shop?category=${encodeURIComponent(cat.name)}`}
                    className="group relative block min-h-[300px] overflow-hidden rounded-3xl transition-transform duration-300 hover:scale-[1.03]"
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${style.gradient} transition-all duration-500 group-hover:scale-110`} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
                    <div className={`absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 shadow-[inset_0_0_60px_rgba(255,255,255,0.15)]`} />
                    <div className="relative z-10 flex h-full min-h-[300px] flex-col justify-between p-8">
                      <motion.span className="text-6xl drop-shadow-lg" whileHover={{ scale: 1.2, rotate: 10 }}>
                        {style.emoji}
                      </motion.span>
                      <div>
                        <h3 className="text-2xl font-bold text-white sm:text-3xl">{cat.name}</h3>
                        <p className="mt-1 text-sm text-white/80 leading-relaxed">{cat.desc}</p>
                        <p className="mt-2 text-xs font-medium text-white/60">{cat.brands}</p>
                        <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm transition-all group-hover:bg-white/30 group-hover:gap-3">
                          Shop Now <ArrowRight className="h-4 w-4" />
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════════ BEST SELLERS ═══════════════════ */}
      {bestSellers.length > 0 && (
        <section className="relative py-20 lg:py-28">
          <div className="absolute inset-0 bg-gradient-to-b from-slate-50/0 via-slate-50/80 to-slate-50/0" />
          <div className="relative mx-auto max-w-7xl px-4 lg:px-8">
            <div className="flex items-end justify-between">
              <div>
                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl"
                >
                  🔥 Best Sellers This Week
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.05 }}
                  className="mt-2 text-slate-500"
                >
                  Most popular with parents right now
                </motion.p>
              </div>
              <div className="hidden items-center gap-2 sm:flex">
                <button onClick={() => scrollCarousel(-1)} className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700">
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button onClick={() => scrollCarousel(1)} className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700">
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          <div
            ref={carouselRef}
            className="relative mt-10 flex gap-5 overflow-x-auto px-4 pb-4 scrollbar-hide lg:px-8"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {bestSellers.map((p, i) => (
              <div key={p.id} className="w-[260px] shrink-0 sm:w-[280px]">
                <ProductCard product={p} index={i} />
              </div>
            ))}
          </div>

          <div className="mt-6 text-center">
            <Link to="/shop?sort=best_selling" className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700">
              View All Best Sellers <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      )}

      {/* ═══════════════════ WHY LITTORA ═══════════════════ */}
      <WhyLittora statsItems={statsItems} story={story} />

      {/* ═══════════════════ TESTIMONIALS ═══════════════════ */}
      <section className="relative py-20 lg:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-50/0 via-primary-50/30 to-slate-50/0" />
        <div className="relative mx-auto max-w-7xl px-4 lg:px-8">
          <div className="text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-4 py-1.5 text-xs font-semibold text-amber-600 uppercase tracking-wider mb-4">
                <Star className="h-3.5 w-3.5 fill-amber-400" /> Trusted by Parents
              </div>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                What Parents Say
              </h2>
              <p className="mx-auto mt-3 max-w-md text-slate-500">
                Real feedback from real Sri Lankan parents
              </p>
            </motion.div>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-3">
            {testimonials.map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12, type: 'spring', stiffness: 100 }}
                whileHover={{ y: -8, transition: { duration: 0.3 } }}
                className="relative group"
              >
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary-400/20 to-teal-400/20 opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-100" />
                <div className="relative rounded-3xl border border-white/60 bg-white/60 p-8 shadow-card backdrop-blur-xl overflow-hidden">
                  <div className="absolute top-0 right-0 h-24 w-24 rounded-bl-full bg-gradient-to-bl from-primary-50/50 to-transparent" />
                  <Quote className="absolute top-6 right-6 h-8 w-8 text-primary-100" />
                  <div className="flex gap-0.5 mb-4">
                    {Array.from({ length: t.stars || 5 }).map((_, j) => (
                      <Star key={j} className="h-4 w-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-sm leading-relaxed text-slate-600 italic min-h-[4.5rem]">"{t.quote}"</p>
                  <div className="mt-6 flex items-center gap-3 pt-4 border-t border-slate-100">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-primary-400 to-teal-400 text-sm font-bold text-white shadow-sm">
                      {t.name?.charAt(0) || '?'}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{t.name}</p>
                      <p className="text-xs text-slate-400">{t.city}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════ OFFER BANNER ═══════════════════ */}
      <section className="py-12">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary-500 via-primary-600 to-teal-500 p-12 text-center text-white shadow-2xl shadow-primary-500/20 sm:p-16"
          >
            <div className="absolute inset-0 animate-diagonal-lines" />
            <div className="absolute -top-24 -right-24 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-white/10 blur-3xl" />

            <div className="relative z-10">
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="inline-flex items-center gap-2 rounded-full bg-white/20 px-5 py-2 text-sm font-semibold backdrop-blur-sm mb-6"
              >
                🎉 {cta.badge}
              </motion.div>
              <h2 className="text-3xl font-bold sm:text-4xl">{cta.headline}</h2>
              <p className="mx-auto mt-4 max-w-md text-base text-white/80">
                {cta.subtitle}
              </p>
              <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                <Link
                  to="/shop"
                  className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-primary-600 shadow-xl transition-all hover:shadow-2xl active:scale-[0.97]"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    Browse Products <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </Link>
                <a
                  href={`https://wa.me/${footer?.whatsapp || '94771234567'}?text=Hi%20Littora!%20I'd%20like%20to%20order`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border-2 border-white/30 px-7 py-3.5 text-sm font-semibold text-white transition-all hover:border-white/60 hover:bg-white/10"
                >
                  Order via WhatsApp 💬
                </a>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════ NEW ARRIVALS ═══════════════════ */}
      {newArrivals.length > 0 && (
        <section className="py-20 lg:py-28">
          <div className="mx-auto max-w-7xl px-4 lg:px-8">
            <div className="flex items-end justify-between">
              <div>
                <motion.h2
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl"
                >
                  Just Arrived
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.05 }}
                  className="mt-2 text-slate-500"
                >
                  Fresh stock just added
                </motion.p>
              </div>
              <Link to="/shop?sort=newest" className="hidden items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700 sm:inline-flex">
                View All <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="mt-10 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
              {newArrivals.slice(0, 8).map((p, i) => (
                <ProductCard key={p.id} product={p} index={i} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════ BLOG PREVIEW ═══════════════════ */}
      {blogPosts.length > 0 && (
        <section className="py-20 lg:py-28">
          <div className="mx-auto max-w-7xl px-4 lg:px-8">
            <div className="text-center">
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl"
              >
                Tips & Guides
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.05 }}
                className="mx-auto mt-3 max-w-lg text-slate-500"
              >
                Helpful advice on choosing the right products for your baby
              </motion.p>
            </div>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {blogPosts.map((post, i) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08, duration: 0.5 }}
                >
                  <Link
                    to={`/blog/${post.slug}`}
                    className="group block overflow-hidden rounded-2xl border border-slate-100/80 bg-white shadow-card transition-all duration-300 hover:shadow-card-hover hover:-translate-y-2"
                  >
                    <div className="aspect-video overflow-hidden bg-slate-50">
                      <img src={post.cover_image || blogPlaceholder} alt={post.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
                    </div>
                    <div className="p-5">
                      <div className="mb-2 flex items-center gap-2 text-xs text-slate-400">
                        <span>{new Date(post.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        <span>·</span>
                        <span>{post.read_time_min} min read</span>
                      </div>
                      <h3 className="text-base font-semibold text-slate-800 leading-snug line-clamp-2 transition-colors group-hover:text-primary-600">{post.title}</h3>
                      <p className="mt-2 text-sm text-slate-500 line-clamp-2">{post.excerpt}</p>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
            <div className="mt-8 text-center">
              <Link to="/blog" className="text-sm font-medium text-primary-600 hover:text-primary-700">
                Read More Articles <ArrowRight className="ml-1 inline h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════ DARK CTA / PRE-FOOTER ═══════════════════ */}
      <section className="relative overflow-hidden bg-slate-900 py-24 lg:py-32">
        <div className="absolute -top-1 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none" className="w-full" preserveAspectRatio="none">
            <path d="M0 60V30C240 0 480 0 720 30C960 60 1200 60 1440 30V60H0Z" fill="var(--color-warm-50)" />
          </svg>
        </div>

        <div className="mx-auto max-w-7xl px-4 text-center lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl font-bold text-white sm:text-4xl lg:text-5xl">{cta.headline}</h2>
            <p className="mx-auto mt-4 max-w-lg text-base text-slate-400 leading-relaxed">
              Join hundreds of Sri Lankan parents who save time and money ordering diapers and wipes from Littora.
            </p>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link
                to="/shop"
                className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-gradient-to-r from-primary-500 to-teal-500 px-10 py-4 text-base font-semibold text-white shadow-xl shadow-primary-500/30 transition-all hover:shadow-2xl active:scale-[0.97]"
              >
                <span className="relative z-10 flex items-center gap-2">
                  Browse Products <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </span>
                <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-white/0 via-white/20 to-white/0 transition-transform duration-700 group-hover:translate-x-full" />
              </Link>
              <a
                href={`https://wa.me/${footer?.whatsapp || '94771234567'}?text=Hi%20Littora!%20I'd%20like%20to%20order`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border-2 border-emerald-500/30 bg-emerald-500/10 px-8 py-4 text-base font-semibold text-emerald-400 transition-all hover:border-emerald-500/50 hover:bg-emerald-500/20"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                Order via WhatsApp
              </a>
            </div>
          </motion.div>
        </div>
      </section>
    </motion.div>
  );
}
