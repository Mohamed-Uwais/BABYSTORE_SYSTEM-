import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../api/client';

export default function PromoBanner() {
  const [banners, setBanners] = useState([]);
  const [current, setCurrent] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem('promo_banner_dismissed')) {
      setDismissed(true);
      return;
    }
    api.get('/promotions/banner')
      .then(r => setBanners(r.data.data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrent(c => (c + 1) % banners.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [banners.length]);

  if (dismissed || banners.length === 0) return null;

  const banner = banners[current];

  function handleDismiss() {
    setDismissed(true);
    sessionStorage.setItem('promo_banner_dismissed', '1');
  }

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="relative overflow-hidden"
          style={{ backgroundColor: banner.banner_color || '#3b82f6' }}
        >
          <div className="mx-auto flex max-w-7xl items-center justify-center gap-3 px-4 py-2.5">
            {banners.length > 1 && (
              <button onClick={() => setCurrent(c => (c - 1 + banners.length) % banners.length)}
                className="rounded-full p-0.5 text-white/60 transition hover:text-white">
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}

            <Link to="/shop" className="text-center text-sm font-semibold text-white hover:underline">
              {banner.banner_text || banner.title}
              {banner.coupon_code && (
                <span className="ml-2 rounded bg-white/20 px-2 py-0.5 font-mono text-xs">
                  {banner.coupon_code}
                </span>
              )}
            </Link>

            {banners.length > 1 && (
              <button onClick={() => setCurrent(c => (c + 1) % banners.length)}
                className="rounded-full p-0.5 text-white/60 transition hover:text-white">
                <ChevronRight className="h-4 w-4" />
              </button>
            )}

            <button onClick={handleDismiss}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-white/60 transition hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>

          {banners.length > 1 && (
            <div className="flex justify-center gap-1 pb-1">
              {banners.map((_, i) => (
                <div key={i} className={`h-1 w-4 rounded-full transition ${i === current ? 'bg-white' : 'bg-white/30'}`} />
              ))}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
