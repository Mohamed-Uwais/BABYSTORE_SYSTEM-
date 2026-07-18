import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShoppingCart, Minus, Plus, ChevronRight, AlertCircle, Check, Truck, ShieldCheck, Loader2, MessageCircle } from 'lucide-react';
import api from '../api/client';
import { useCart } from '../context/CartContext';
import ProductCard from '../components/ProductCard';
import ImageGallery from '../components/ImageGallery';
import SEO from '../components/SEO';
import { usePromo } from '../context/PromoContext';

function formatPrice(amount) {
  return `Rs. ${Number(amount).toLocaleString('en-LK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export default function ProductDetail() {
  const { slug } = useParams();
  const { addItem } = useCart();
  const { getProductPromos } = usePromo();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get(`/products/${slug}`)
      .then(r => {
        setProduct(r.data.data);
        setSelectedVariant(r.data.data.variants[0] || null);
        setQty(1);
      })
      .catch(() => setProduct(null))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-400" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <span className="mb-4 text-5xl">😕</span>
        <h2 className="text-xl font-bold text-slate-800">Product Not Found</h2>
        <p className="mt-2 text-sm text-slate-500">The product you're looking for doesn't exist or has been removed.</p>
        <Link to="/shop" className="mt-6 rounded-full bg-primary-500 px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-600">
          Back to Shop
        </Link>
      </div>
    );
  }

  const [selectedTier, setSelectedTier] = useState(null);

  const v = selectedVariant;
  const hasTiers = v?.price_tiers?.length > 0;
  const hasDiscount = v && v.discount_type !== 'none' && Number(v.discount_value) > 0;
  const basePrice = hasDiscount ? Number(v.discounted_price) : Number(v?.retail_price);
  const finalPrice = selectedTier ? Number(selectedTier.tier_price) : basePrice;
  const discountPercent = hasDiscount && v.discount_type === 'percent' ? Number(v.discount_value) : null;

  // Build tier options including base (1 pack) option
  const tierOptions = v && hasTiers ? [
    { min_quantity: 1, tier_price: basePrice, label: v.variant_label, is_base: true },
    ...v.price_tiers.map(t => ({ ...t, min_quantity: Number(t.min_quantity), tier_price: Number(t.tier_price) })),
  ] : [];

  // Find best value tier (lowest per-pack cost)
  const bestValueIdx = tierOptions.length > 1
    ? tierOptions.reduce((best, t, i) => (t.tier_price / t.min_quantity < tierOptions[best].tier_price / tierOptions[best].min_quantity ? i : best), 0)
    : -1;

  useEffect(() => {
    setSelectedTier(null);
    setQty(1);
  }, [selectedVariant]);

  const effectiveQty = selectedTier ? selectedTier.min_quantity : qty;

  const handleAddToCart = () => {
    if (!v || !v.in_stock) return;
    const cartPrice = selectedTier ? selectedTier.tier_price / selectedTier.min_quantity : basePrice;
    addItem(
      { id: product.id, name: product.name, slug: product.slug, brand_name: product.brand_name, image_url: v.image_url },
      { id: v.id, label: v.variant_label, retail_price: v.retail_price, discounted_price: cartPrice !== Number(v.retail_price) ? cartPrice : null, in_stock: v.in_stock, image_url: v.image_url },
      effectiveQty
    );
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const whatsappText = `Hi! I'd like to order ${product.name}${v ? ` (${v.variant_label})` : ''} x${qty}`;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <SEO
        title={product.name}
        path={`/product/${product.slug}`}
        description={product.description || `Buy ${product.name} from ${product.brand_name}. Genuine products, great prices, island-wide delivery.`}
        type="product"
      />
      {/* Breadcrumb */}
      <div className="border-b border-slate-100 bg-white">
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-3 text-xs text-slate-500 lg:px-8">
          <Link to="/" className="hover:text-primary-600">Home</Link>
          <ChevronRight className="h-3 w-3" />
          <Link to="/shop" className="hover:text-primary-600">Shop</Link>
          {product.category_name && (
            <>
              <ChevronRight className="h-3 w-3" />
              <Link to={`/shop?category=${encodeURIComponent(product.category_name)}`} className="hover:text-primary-600">{product.category_name}</Link>
            </>
          )}
          <ChevronRight className="h-3 w-3" />
          <span className="text-slate-800 font-medium truncate max-w-[200px]">{product.name}</span>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-10 lg:px-8 lg:py-14">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          {/* Product Image with zoom */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <ImageGallery
              images={product.images}
              variantImageUrl={v?.image_url}
              productName={product.name}
              hasDiscount={hasDiscount}
              discountLabel={discountPercent ? `-${discountPercent}%` : 'SALE'}
            />
          </motion.div>

          {/* Product Info */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            {product.brand_name && (
              <Link
                to={`/shop?brand=${encodeURIComponent(product.brand_name)}`}
                className="mb-2 inline-block text-xs font-semibold tracking-[0.15em] text-primary-500 uppercase hover:text-primary-600"
              >
                {product.brand_name}
              </Link>
            )}
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{product.name}</h1>

            {/* Price */}
            <div className="mt-4 flex items-baseline gap-3">
              <span className="font-mono text-3xl font-bold text-slate-900">{formatPrice(finalPrice)}</span>
              {(hasDiscount || selectedTier) && (
                <span className="font-mono text-lg text-slate-400 line-through">{formatPrice(selectedTier ? basePrice * selectedTier.min_quantity : v.retail_price)}</span>
              )}
              {selectedTier && (
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                  {selectedTier.min_quantity} pack{selectedTier.min_quantity > 1 ? 's' : ''}
                </span>
              )}
            </div>

            {/* Stock status */}
            {v && (
              <div className="mt-3">
                {v.in_stock ? (
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600">
                    <Check className="h-4 w-4" /> In Stock
                    {v.low_stock_warning && <span className="text-amber-500 ml-2">Only {v.low_stock_warning} left</span>}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-red-500">
                    <AlertCircle className="h-4 w-4" /> Out of Stock
                  </span>
                )}
              </div>
            )}

            {/* Active Promotions */}
            {product && (() => {
              const promos = getProductPromos(product.id, product.category_id, product.brand_id);
              if (promos.length === 0) return null;
              return (
                <div className="mt-4 space-y-2">
                  {promos.map(p => (
                    <div key={p.id} className="flex items-center gap-2 rounded-2xl bg-emerald-50/80 px-4 py-3">
                      <span className="text-lg">
                        {p.promo_type === 'buy_x_get_y' ? '🎁' : p.promo_type === 'free_delivery' ? '🚚' : p.promo_type === 'bundle_deal' ? '📦' : '🏷️'}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-emerald-800">{p.title}</p>
                        <p className="text-xs text-emerald-600">
                          {p.promo_type === 'percentage_discount' ? `${p.discount_value}% off this product` :
                           p.promo_type === 'fixed_discount' ? `Rs. ${Number(p.discount_value).toLocaleString()} off` :
                           p.promo_type === 'buy_x_get_y' ? `Buy ${p.buy_quantity} of this product and get ${p.get_quantity} FREE!` :
                           p.promo_type === 'bundle_deal' ? 'Buy together & save' :
                           p.promo_type === 'free_delivery' ? `Free delivery on orders over Rs. ${Number(p.min_order_amount || 0).toLocaleString()}` :
                           p.description || ''}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* Description */}
            {product.description && (
              <p className="mt-6 text-sm leading-[1.7] text-slate-600">{product.description}</p>
            )}

            {/* Variant selector */}
            {product.variants.length > 1 && (
              <div className="mt-6">
                <h3 className="mb-3 text-sm font-semibold text-slate-700">Select Size / Variant</h3>
                <div className="flex flex-wrap gap-2">
                  {product.variants.map(variant => (
                    <button
                      key={variant.id}
                      onClick={() => { setSelectedVariant(variant); setQty(1); }}
                      className={`rounded-2xl border-2 px-5 py-3 text-sm font-medium transition-all ${
                        selectedVariant?.id === variant.id
                          ? 'border-primary-500 bg-primary-50 text-primary-700 shadow-sm shadow-primary-200/50'
                          : variant.in_stock
                            ? 'border-slate-200 text-slate-600 hover:border-primary-300 hover:bg-primary-50/50'
                            : 'border-slate-100 text-slate-400 line-through opacity-60'
                      }`}
                    >
                      {variant.variant_label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Pack/Tier Options */}
            {hasTiers && v && (
              <div className="mt-6">
                <h3 className="mb-3 text-sm font-semibold text-slate-700">Choose Pack Size</h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {tierOptions.map((t, i) => {
                    const regularTotal = basePrice * t.min_quantity;
                    const savings = regularTotal - t.tier_price;
                    const isBestValue = i === bestValueIdx && tierOptions.length > 2;
                    const isSelected = selectedTier
                      ? selectedTier.min_quantity === t.min_quantity
                      : t.is_base;
                    const stockOk = v.current_stock >= t.min_quantity;
                    return (
                      <button
                        key={i}
                        disabled={!stockOk}
                        onClick={() => {
                          if (t.is_base) { setSelectedTier(null); setQty(1); }
                          else { setSelectedTier(t); setQty(t.min_quantity); }
                        }}
                        className={`relative rounded-2xl border-2 px-4 py-3 text-left transition-all ${
                          !stockOk
                            ? 'cursor-not-allowed border-slate-100 opacity-50'
                            : isSelected
                              ? 'border-primary-500 bg-primary-50 shadow-sm shadow-primary-200/50'
                              : 'border-slate-200 hover:border-primary-300 hover:bg-primary-50/50'
                        }`}
                      >
                        {isBestValue && stockOk && (
                          <span className="absolute -top-2.5 right-3 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold text-amber-900 shadow-sm">BEST VALUE</span>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-slate-800">
                            {t.min_quantity} Pack{t.min_quantity > 1 ? 's' : ''}
                            {t.label && <span className="ml-1 text-xs font-normal text-slate-500">({t.label})</span>}
                          </span>
                          <span className="font-mono text-sm font-bold text-slate-900">{formatPrice(t.tier_price)}</span>
                        </div>
                        {savings > 0 && (
                          <p className="mt-0.5 text-xs font-medium text-emerald-600">Save {formatPrice(savings)}</p>
                        )}
                        {!stockOk && (
                          <p className="mt-0.5 text-xs text-red-400">Not enough stock</p>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quantity + Add to Cart */}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              {!hasTiers && (
                <div className="flex items-center overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <button
                    onClick={() => setQty(q => Math.max(1, q - 1))}
                    className="flex h-12 w-12 items-center justify-center text-slate-500 transition-colors hover:bg-slate-50"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="flex h-12 w-12 items-center justify-center font-mono text-sm font-semibold text-slate-800">{qty}</span>
                  <button
                    onClick={() => setQty(q => q + 1)}
                    className="flex h-12 w-12 items-center justify-center text-slate-500 transition-colors hover:bg-slate-50"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              )}

              <button
                onClick={handleAddToCart}
                disabled={!v?.in_stock || added}
                className={`flex flex-1 items-center justify-center gap-2 rounded-2xl py-3.5 text-base font-semibold transition-all ${
                  added
                    ? 'bg-emerald-500 text-white scale-[0.97]'
                    : v?.in_stock
                      ? 'bg-gradient-to-r from-primary-500 to-teal-500 text-white shadow-lg shadow-primary-500/25 hover:shadow-xl active:scale-[0.97]'
                      : 'cursor-not-allowed bg-slate-200 text-slate-400'
                }`}
              >
                {added ? (
                  <><Check className="h-5 w-5" /> Added to Cart</>
                ) : (
                  <><ShoppingCart className="h-5 w-5" /> {hasTiers ? `Add ${effectiveQty} Pack${effectiveQty > 1 ? 's' : ''} to Cart` : 'Add to Cart'}</>
                )}
              </button>
            </div>

            {/* Buy via WhatsApp */}
            <a
              href={`https://wa.me/94771234567?text=${encodeURIComponent(whatsappText)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-[#25D366]/30 bg-[#25D366]/5 py-3.5 text-sm font-semibold text-[#25D366] transition-all hover:border-[#25D366] hover:bg-[#25D366] hover:text-white sm:w-auto sm:px-8"
            >
              <MessageCircle className="h-5 w-5" />
              Buy via WhatsApp
            </a>

            {/* Trust badges */}
            <div className="mt-8 grid grid-cols-2 gap-3">
              {[
                { icon: Truck, text: 'Island-wide Delivery' },
                { icon: ShieldCheck, text: '100% Genuine Products' },
              ].map((b, i) => (
                <div key={i} className="flex items-center gap-2 rounded-2xl bg-slate-50/80 px-4 py-3">
                  <b.icon className="h-5 w-5 text-primary-500" />
                  <span className="text-xs font-medium text-slate-600">{b.text}</span>
                </div>
              ))}
            </div>

            {/* Tags */}
            {product.tags.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-2">
                {product.tags.map(tag => (
                  <span key={tag.id} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
                    {tag.name}
                  </span>
                ))}
              </div>
            )}
          </motion.div>
        </div>

        {/* Related Products */}
        {product.related.length > 0 && (
          <section className="mt-20 border-t border-slate-100 pt-14">
            <h2 className="mb-8 text-xl font-bold tracking-tight text-slate-900">You May Also Like</h2>
            <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
              {product.related.map((p, i) => (
                <ProductCard key={p.id} product={p} index={i} />
              ))}
            </div>
          </section>
        )}
      </div>
    </motion.div>
  );
}
