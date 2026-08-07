// Subsequence match: every char of query appears in target in order
function subsequenceMatch(query, target) {
  let qi = 0;
  for (let ti = 0; ti < target.length && qi < query.length; ti++) {
    if (target[ti] === query[qi]) qi++;
  }
  return qi === query.length;
}

// Get matched character indices for highlighting
function subsequenceIndices(query, target) {
  const indices = [];
  let qi = 0;
  for (let ti = 0; ti < target.length && qi < query.length; ti++) {
    if (target[ti] === query[qi]) { indices.push(ti); qi++; }
  }
  return qi === query.length ? indices : null;
}

// Token match: every word in query appears somewhere in target
function tokenMatch(queryTokens, target) {
  const lower = target.toLowerCase();
  return queryTokens.every(t => lower.includes(t));
}

// Rank: 0 = exact SKU, 1 = SKU prefix, 2 = subsequence SKU, 3 = name tokens, 4 = no match
function rankResult(query, sku, name, variantLabel) {
  const q = query.toLowerCase();
  const s = (sku || '').toLowerCase();
  const fullName = `${name || ''} ${variantLabel || ''}`.toLowerCase();

  if (s === q) return 0;
  if (s.startsWith(q)) return 1;
  if (subsequenceMatch(q, s)) return 2;

  const tokens = q.split(/\s+/).filter(t => t.length > 0);
  if (tokens.length > 0 && tokenMatch(tokens, fullName)) return 3;

  return 4;
}

// Main search function: returns sorted results with rank and highlight info
export function fuzzySearchProducts(products, query) {
  if (!query || !query.trim()) return products.map(p => ({ ...p, _rank: 4, _skuIndices: null }));

  const q = query.trim().toLowerCase();
  const tokens = q.split(/\s+/).filter(t => t.length > 0);
  const isMultiWord = tokens.length > 1;

  const scored = [];
  for (const p of products) {
    const sku = (p.sku || '').toLowerCase();
    const name = (p.name || p.product_name || '').toLowerCase();
    const label = (p.variant_label || '').toLowerCase();
    const barcode = (p.barcode || '').toLowerCase();
    const fullText = `${name} ${label} ${sku} ${barcode}`;

    let rank = 4;
    let skuIndices = null;

    // Exact SKU
    if (sku === q) { rank = 0; skuIndices = [...Array(sku.length).keys()]; }
    // SKU prefix
    else if (sku.startsWith(q)) { rank = 1; skuIndices = [...Array(q.length).keys()]; }
    // Subsequence on SKU
    else if (!isMultiWord && subsequenceMatch(q, sku)) { rank = 2; skuIndices = subsequenceIndices(q, sku); }
    // Token match on name + variant + sku
    else if (tokens.length > 0 && tokenMatch(tokens, fullText)) { rank = 3; }
    // Single token partial match anywhere
    else if (!isMultiWord && (name.includes(q) || label.includes(q) || barcode.includes(q))) { rank = 3; }

    if (rank < 4) {
      scored.push({ ...p, _rank: rank, _skuIndices: skuIndices });
    }
  }

  scored.sort((a, b) => {
    if (a._rank !== b._rank) return a._rank - b._rank;
    return (a.name || a.product_name || '').localeCompare(b.name || b.product_name || '');
  });

  return scored;
}

export { subsequenceMatch, subsequenceIndices, tokenMatch, rankResult };
