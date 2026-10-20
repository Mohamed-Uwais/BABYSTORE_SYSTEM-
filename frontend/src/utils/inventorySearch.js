import { fuzzySearchProducts } from './fuzzySearch.js';

export function filterInventoryGroups(grouped, query) {
  if (!query.trim()) return grouped;
  // The product API returns the parent ID as `id`, not `product_id`.
  const variants = grouped.flatMap(product => product.variants.map(variant => ({
    ...variant, name: product.name, product_id: product.id,
  })));
  const matchedIds = new Set(fuzzySearchProducts(variants, query).map(v => v.product_id));
  return grouped.filter(product => matchedIds.has(product.id));
}
