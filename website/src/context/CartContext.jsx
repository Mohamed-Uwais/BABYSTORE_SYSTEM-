import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const CartContext = createContext(null);
const CartActionsContext = createContext(null);
const STORAGE_KEY = 'littora_cart';

function loadCart() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(item => item && typeof item.key === 'string' && Number.isFinite(item.price) && item.price >= 0 && Number.isSafeInteger(item.qty) && item.qty > 0) : [];
  } catch { return []; }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(loadCart);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch { /* cart stays usable in memory */ }
  }, [items]);

  const addItem = useCallback((product, variant, qty = 1) => {
    setItems(prev => {
      const key = `${product.id}-${variant.id}`;
      const existing = prev.find(i => i.key === key);
      if (existing) {
        return prev.map(i => i.key === key ? { ...i, qty: i.qty + qty } : i);
      }
      return [...prev, {
        key,
        productId: product.id,
        variantId: variant.id,
        name: product.name,
        brand: product.brand_name,
        variantLabel: variant.label,
        price: Number(variant.discounted_price || variant.retail_price),
        originalPrice: variant.discounted_price ? Number(variant.retail_price) : null,
        image: product.image_url || variant.image_url,
        slug: product.slug,
        inStock: variant.in_stock,
        qty,
      }];
    });
    setOpen(true);
  }, []);

  const removeItem = useCallback((key) => {
    setItems(prev => prev.filter(i => i.key !== key));
  }, []);

  const updateQty = useCallback((key, qty) => {
    if (qty < 1) return removeItem(key);
    setItems(prev => prev.map(i => i.key === key ? { ...i, qty } : i));
  }, [removeItem]);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const itemCount = useMemo(() => items.reduce((sum, i) => sum + i.qty, 0), [items]);
  const subtotal = useMemo(() => items.reduce((sum, i) => sum + i.price * i.qty, 0), [items]);
  const actions = useMemo(() => ({ addItem, updateQty, removeItem, clearCart, setOpen }), [addItem, updateQty, removeItem, clearCart]);
  const value = useMemo(() => ({ items, open, itemCount, subtotal, ...actions }), [items, open, itemCount, subtotal, actions]);

  return (
    <CartActionsContext.Provider value={actions}>
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
    </CartActionsContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}

export function useCartActions() {
  return useContext(CartActionsContext);
}
