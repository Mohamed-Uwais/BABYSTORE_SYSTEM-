function distance(a, b) {
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(row[j - 1] + 1, previous[j] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    previous = row;
  }
  return previous[b.length];
}

function matchingProductIds(rows, query) {
  const words = String(query).toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu)?.slice(0, 8) || [];
  if (!words.length) return [];
  return rows.filter(row => {
    const tokens = `${row.name} ${row.brand_name || ''} ${row.category_name || ''}`.toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) || [];
    return words.every(word => tokens.some(token => token.includes(word) ||
      (word.length >= 4 && distance(word, token.slice(0, word.length + 1)) <= (word.length >= 7 ? 2 : 1))));
  }).map(row => row.id);
}
module.exports = { matchingProductIds };
