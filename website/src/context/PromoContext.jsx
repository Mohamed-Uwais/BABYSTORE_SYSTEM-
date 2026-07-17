import { createContext, useContext, useEffect, useState } from 'react';
import api from '../api/client';

const PromoContext = createContext({
  activePromos: [],
  getProductPromos: () => [],
  loading: true,
});

export function PromoProvider({ children }) {
  const [activePromos, setActivePromos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/promotions/active')
      .then(r => setActivePromos(r.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function getProductPromos(productId, categoryId, brandId) {
    return activePromos.filter(p => {
      if (p.promo_type === 'coupon_code') return false;
      if (!p.targets || p.targets.length === 0) return true;
      return p.targets.some(t => {
        if (t.target_type === 'all') return true;
        if (t.target_type === 'product' && Number(t.target_id) === Number(productId)) return true;
        if (t.target_type === 'category' && Number(t.target_id) === Number(categoryId)) return true;
        if (t.target_type === 'brand' && Number(t.target_id) === Number(brandId)) return true;
        return false;
      });
    });
  }

  return (
    <PromoContext.Provider value={{ activePromos, getProductPromos, loading }}>
      {children}
    </PromoContext.Provider>
  );
}

export function usePromo() {
  return useContext(PromoContext);
}
