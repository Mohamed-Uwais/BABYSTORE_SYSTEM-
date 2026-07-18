import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X, ZoomIn } from 'lucide-react';

const placeholder = 'data:image/svg+xml,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600"><rect fill="#f0f9ff" width="600" height="600"/><g opacity=".35"><rect x="180" y="150" width="240" height="300" rx="24" fill="#bae6fd"/><text x="300" y="310" text-anchor="middle" font-family="system-ui" font-size="40" font-weight="600" fill="#0ea5e9">LD</text></g></svg>`
);

function ImageZoom({ src, alt }) {
  const containerRef = useRef(null);
  const [zoomed, setZoomed] = useState(false);
  const [pos, setPos] = useState({ x: 50, y: 50 });

  const handleMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setPos({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  };

  return (
    <div
      ref={containerRef}
      className="relative aspect-square overflow-hidden rounded-3xl border border-slate-100/80 bg-white shadow-card cursor-zoom-in"
      onMouseEnter={() => setZoomed(true)}
      onMouseLeave={() => setZoomed(false)}
      onMouseMove={handleMove}
    >
      <img
        src={src || placeholder}
        alt={alt}
        className="h-full w-full object-cover transition-transform duration-300"
        style={zoomed ? { transform: 'scale(1.8)', transformOrigin: `${pos.x}% ${pos.y}%` } : {}}
      />
    </div>
  );
}

function Lightbox({ images, currentIndex, onClose, onNavigate }) {
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') onNavigate(-1);
      if (e.key === 'ArrowRight') onNavigate(1);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, onNavigate]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={onClose}
    >
      <button onClick={onClose} className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2 text-white/80 transition hover:bg-white/20 hover:text-white">
        <X className="h-6 w-6" />
      </button>

      {images.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); onNavigate(-1); }}
            className="absolute left-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white/80 transition hover:bg-white/20"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onNavigate(1); }}
            className="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white/80 transition hover:bg-white/20"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}

      <motion.img
        key={currentIndex}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        src={images[currentIndex]?.image_url || images[currentIndex]}
        alt=""
        className="max-h-[85vh] max-w-[90vw] rounded-2xl object-contain shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />

      {images.length > 1 && (
        <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-2">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); onNavigate(i - currentIndex); }}
              className={`h-2 w-2 rounded-full transition ${i === currentIndex ? 'bg-white scale-125' : 'bg-white/40 hover:bg-white/60'}`}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}

export default function ImageGallery({ images, variantImageUrl, productName, hasDiscount, discountLabel }) {
  const allImages = images?.length
    ? images
    : variantImageUrl
      ? [{ image_url: variantImageUrl }]
      : [{ image_url: placeholder }];

  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    if (variantImageUrl && images?.length) {
      const variantIdx = images.findIndex(img => img.variant_id && img.image_url === variantImageUrl);
      if (variantIdx >= 0) setActiveIndex(variantIdx);
    }
  }, [variantImageUrl]);

  const navigateLightbox = useCallback((delta) => {
    setActiveIndex(prev => {
      const next = prev + delta;
      if (next < 0) return allImages.length - 1;
      if (next >= allImages.length) return 0;
      return next;
    });
  }, [allImages.length]);

  return (
    <div className="relative">
      <div className="relative cursor-pointer" onClick={() => setLightboxOpen(true)}>
        <ImageZoom src={allImages[activeIndex]?.image_url || placeholder} alt={productName} />
        <button className="absolute bottom-4 right-4 rounded-full bg-white/80 p-2 text-slate-600 shadow-md backdrop-blur-sm transition hover:bg-white hover:text-slate-900">
          <ZoomIn className="h-5 w-5" />
        </button>
      </div>

      {hasDiscount && (
        <span className="absolute top-4 left-4 rounded-full bg-accent-500 px-4 py-1.5 text-sm font-bold text-white shadow-md">
          {discountLabel}
        </span>
      )}

      {allImages.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {allImages.map((img, i) => (
            <button
              key={i}
              onClick={() => setActiveIndex(i)}
              className={`h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl border-2 transition ${
                i === activeIndex
                  ? 'border-primary-500 ring-2 ring-primary-200 shadow-sm'
                  : 'border-slate-200 opacity-70 hover:opacity-100 hover:border-slate-300'
              }`}
            >
              <img src={img.image_url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}

      <AnimatePresence>
        {lightboxOpen && (
          <Lightbox
            images={allImages}
            currentIndex={activeIndex}
            onClose={() => setLightboxOpen(false)}
            onNavigate={navigateLightbox}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
