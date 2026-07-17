import { useRef, useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { ShoppingCart, Check } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { usePromo } from '../context/PromoContext';

const placeholder = 'data:image/svg+xml,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"><rect fill="#f0f9ff" width="400" height="400"/><g opacity=".35"><rect x="120" y="100" width="160" height="200" rx="16" fill="#bae6fd"/><text x="200" y="210" text-anchor="middle" font-family="system-ui" font-size="28" font-weight="600" fill="#0ea5e9">LD</text></g></svg>`
);

function formatPrice(amount) {
  return `Rs. ${Number(amount).toLocaleString('en-LK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export default function ProductCard({ product, index = 0 }) {
  const {
    id, name, slug, brand_name, retail_price, image_url,
    in_stock, on_sale, discounted_price, min_discounted_price, variant_count, has_tiers
  } = product;

  const { addItem } = useCart();
  const { getProductPromos } = usePromo();
  const [added, setAdded] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  const promos = getProductPromos(id, product.category_id, product.brand_id);
  const promoBadge = promos.length > 0 ? promos[0] : null;

  const finalPrice = min_discounted_price || discounted_price || retail_price;
  const hasDiscount = on_sale && Number(finalPrice) < Number(retail_price);

  const ref = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [5, -5]), { stiffness: 300, damping: 30 });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-5, 5]), { stiffness: 300, damping: 30 });

  const handleMouse = useCallback((e) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    y.set((e.clientY - rect.top) / rect.height - 0.5);
  }, [x, y]);

  const handleLeave = useCallback(() => { x.set(0); y.set(0); }, [x, y]);

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!in_stock || added) return;
    addItem(
      { id, name, slug, brand_name, image_url },
      { id: product.variant_id || id, label: product.variant_label || '', retail_price, discounted_price: hasDiscount ? finalPrice : null, in_stock, image_url },
      1
    );
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ delay: Math.min(index * 0.06, 0.3), duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.div
        ref={ref}
        onMouseMove={handleMouse}
        onMouseLeave={handleLeave}
        style={{ rotateX, rotateY, transformPerspective: 800 }}
      >
        <Link
          to={`/product/${slug}`}
          className="group relative block overflow-hidden rounded-2xl border border-slate-100/80 bg-white shadow-card transition-shadow duration-300 hover:shadow-card-hover"
        >
          {/* Image */}
          <div className="relative aspect-square overflow-hidden bg-slate-50">
            <img
              src={image_url || placeholder}
              alt={name}
              loading="lazy"
              onLoad={() => setImgLoaded(true)}
              className={`h-full w-full object-cover transition-all duration-500 group-hover:scale-105 ${imgLoaded ? '' : 'blur-sm scale-105'}`}
            />

            {/* Out of stock overlay */}
            {!in_stock && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-[2px]">
                <span className="rounded-full bg-slate-800 px-4 py-1.5 text-xs font-semibold text-white">Out of Stock</span>
              </div>
            )}

            {/* Sale ribbon */}
            {hasDiscount && in_stock && (
              <div className="absolute -right-8 top-4 rotate-45 bg-accent-500 px-10 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
                Sale
              </div>
            )}

            {/* Promo badge */}
            {promoBadge && in_stock && !hasDiscount && (
              <div className="absolute left-2 top-2 z-10">
                <span className="inline-block rounded-lg bg-primary-500 px-2 py-1 text-[10px] font-bold text-white shadow-sm">
                  {promoBadge.promo_type === 'percentage_discount' ? `${promoBadge.discount_value}% OFF` :
                   promoBadge.promo_type === 'fixed_discount' ? `Rs.${Number(promoBadge.discount_value).toLocaleString()} OFF` :
                   promoBadge.promo_type === 'buy_x_get_y' ? `Buy ${promoBadge.buy_quantity} Get ${promoBadge.get_quantity} Free` :
                   promoBadge.promo_type === 'bundle_deal' ? 'Bundle Deal' :
                   promoBadge.promo_type === 'free_delivery' ? 'Free Delivery' : 'PROMO'}
                </span>
              </div>
            )}

            {/* Add to cart — slides up on hover */}
            {in_stock && (
              <div className="absolute inset-x-0 bottom-0 translate-y-full transition-transform duration-300 ease-out group-hover:translate-y-0">
                <div className="p-3 pt-8 bg-gradient-to-t from-black/50 to-transparent">
                  {has_tiers ? (
                    <span className="flex w-full items-center justify-center gap-2 rounded-xl bg-white py-2.5 text-xs font-semibold text-slate-800 hover:bg-primary-500 hover:text-white transition-all">
                      View Options
                    </span>
                  ) : (
                    <button
                      onClick={handleAddToCart}
                      className={`flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold transition-all active:scale-95 ${
                        added
                          ? 'bg-emerald-500 text-white'
                          : 'bg-white text-slate-800 hover:bg-primary-500 hover:text-white'
                      }`}
                    >
                      {added ? <><Check className="h-3.5 w-3.5" /> Added</> : <><ShoppingCart className="h-3.5 w-3.5" /> Add to Cart</>}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="p-4 transition-transform duration-300 group-hover:-translate-y-1">
            {brand_name && (
              <p className="mb-1 text-[10px] font-semibold tracking-widest text-primary-500 uppercase">{brand_name}</p>
            )}
            <h3 className="text-sm font-semibold text-slate-800 leading-snug line-clamp-2 min-h-[2.5rem]">{name}</h3>
            {variant_count > 1 && (
              <p className="mt-0.5 text-[11px] text-slate-400">{variant_count} sizes available</p>
            )}
            <div className="mt-2 flex items-baseline gap-2">
              {has_tiers && <span className="text-xs font-medium text-slate-500">From</span>}
              <span className="font-mono text-base font-bold text-slate-900">{formatPrice(finalPrice)}</span>
              {hasDiscount && (
                <span className="font-mono text-xs text-slate-400 line-through">{formatPrice(retail_price)}</span>
              )}
            </div>
          </div>
        </Link>
      </motion.div>
    </motion.div>
  );
}
