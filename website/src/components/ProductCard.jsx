import DepthSurface from './DepthSurface';
import { memo, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShoppingCart, Check } from 'lucide-react';
import { useCartActions } from '../context/CartContext';
import { usePromo } from '../context/PromoContext';
import {useStoreMotion} from './StoreMotion';

const placeholder = 'data:image/svg+xml,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"><rect fill="#f0f9ff" width="400" height="400"/><g opacity=".35"><rect x="120" y="100" width="160" height="200" rx="16" fill="#bae6fd"/><text x="200" y="210" text-anchor="middle" font-family="system-ui" font-size="28" font-weight="600" fill="#0ea5e9">LD</text></g></svg>`
);

function formatPrice(amount) {
  return `Rs. ${Number(amount).toLocaleString('en-LK', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function ProductCard({ product, index = 0 }) {
  const {reduced}=useStoreMotion();
  const {
    id, name, slug, brand_name, retail_price, mrp, image_url,
    in_stock, on_sale, discounted_price, min_discounted_price, variant_count, has_tiers,
    second_image_url, discount_type, discount_value,
  } = product;

  const { addItem } = useCartActions();
  const { getProductPromos } = usePromo();
  const [added, setAdded] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [loadSecondary, setLoadSecondary] = useState(false);
  const [secondaryLoaded, setSecondaryLoaded] = useState(null);
  const addedTimer = useRef(null);
  useEffect(() => () => clearTimeout(addedTimer.current), []);

  const promos = getProductPromos(id, product.category_id, product.brand_id);
  const promoBadge = promos.length > 0 ? promos[0] : null;

  const finalPrice = min_discounted_price ?? discounted_price ?? retail_price;
  const hasDiscount = on_sale && Number(finalPrice) < Number(retail_price);
  const hasMrpDiscount = mrp && Number(mrp) > Number(retail_price);
  const mrpPercent = hasMrpDiscount ? Math.round((Number(mrp) - Number(retail_price)) / Number(mrp) * 100) : 0;

  const discountBadgeText = discount_type === 'percent' && Number(discount_value) > 0
    ? `-${Number(discount_value)}%`
    : discount_type === 'amount' && Number(discount_value) > 0
      ? `Rs. ${Number(discount_value).toLocaleString()} OFF`
      : hasMrpDiscount && mrpPercent > 0
        ? `-${mrpPercent}%`
        : null;
  const showStrikePrice = hasMrpDiscount ? Number(mrp) : (hasDiscount ? Number(retail_price) : null);

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
    clearTimeout(addedTimer.current);
    addedTimer.current = setTimeout(() => setAdded(false), 1800);
  };

  return (
    <motion.div
      initial={reduced?false:{ opacity: 0, y: 20, scale: 0.98 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ delay: reduced?0:Math.min(index * 0.04, 0.16), duration: reduced?0:0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <DepthSurface className="product-depth">
        <Link
          to={`/product/${slug}`}
          onPointerEnter={event=>{if(event.pointerType==='mouse')setLoadSecondary(true);}}
          onFocus={()=>setLoadSecondary(true)}
          className="product-card-face group relative block overflow-hidden rounded-2xl border border-slate-100/80 bg-white shadow-card transition-shadow duration-300 hover:shadow-card-hover"
        >
          {/* Image */}
          <div className="product-media-layer relative aspect-square overflow-hidden bg-slate-50">
            <img
              src={image_url || placeholder}
              alt={name}
              loading="lazy"
              decoding="async"
              width="400"
              height="400"
              onLoad={() => setImgLoaded(true)}
              className={`h-full w-full object-cover transition-[opacity,transform] duration-500 ${second_image_url && secondaryLoaded === second_image_url ? 'group-hover:opacity-0' : 'group-hover:scale-105'} ${imgLoaded ? '' : 'scale-105'}`}
            />
            {second_image_url && loadSecondary && (
              <img
                src={second_image_url}
                alt={name}
                loading="lazy"
                decoding="async"
                width="400"
                height="400"
                onLoad={() => setSecondaryLoaded(second_image_url)}
                className={`absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-500 ${secondaryLoaded === second_image_url ? 'group-hover:opacity-100' : ''}`}
              />
            )}

            {/* Out of stock overlay */}
            {!in_stock && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-[2px]">
                <span className="rounded-full bg-slate-800 px-4 py-1.5 text-xs font-semibold text-white">Out of Stock</span>
              </div>
            )}

            {/* Discount badge */}
            {discountBadgeText && in_stock && (
              <div className="absolute left-2 top-2 z-10">
                <span className="inline-block rounded-lg bg-red-500 px-2 py-1 text-[10px] font-bold text-white shadow-sm">
                  {discountBadgeText}
                </span>
              </div>
            )}

            {/* Promo badge (only if no discount badge) */}
            {promoBadge && in_stock && !discountBadgeText && (
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
                  {has_tiers || variant_count > 1 || !product.variant_id ? (
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
              <p className="mt-0.5 text-xs text-slate-600">{variant_count} options</p>
            )}
            <div className="mt-2">
              {Number(product.pieces_per_pack)>0&&<p className="mb-1 text-xs text-slate-600">{product.pieces_per_pack} pieces · Rs. {(Number(finalPrice)/Number(product.pieces_per_pack)).toFixed(2)} each</p>}
              {showStrikePrice && (
                <p className="font-mono text-xs text-slate-400 line-through">{formatPrice(showStrikePrice)}</p>
              )}
              <div className="flex items-baseline gap-2">
                {has_tiers && <span className="text-xs font-medium text-slate-500">From</span>}
                <span className="font-mono text-base font-bold text-teal-600">{formatPrice(finalPrice)}</span>
              </div>
            </div>
          </div>
        </Link>
      </DepthSurface>
    </motion.div>
  );
}

export default memo(ProductCard);
