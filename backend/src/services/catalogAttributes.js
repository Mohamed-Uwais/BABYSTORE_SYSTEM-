const fail = message => { throw Object.assign(new Error(message), {status:400}); };
const safeKey = key => typeof key === 'string' && /^[a-z][a-z0-9_]{0,39}$/.test(key) && !['constructor','prototype','__proto__'].includes(key);
function definitions(value) {
  if (!Array.isArray(value) || value.length > 20) fail('Use at most 20 filter attributes per category');
  const keys = new Set();
  return value.map(item => {
    if (!item || !safeKey(item.key) || keys.has(item.key)) fail('Attribute keys must be unique lowercase identifiers');
    keys.add(item.key);
    if (typeof item.label !== 'string' || !item.label.trim() || item.label.length > 80) fail('Each attribute needs a label of at most 80 characters');
    if (!Array.isArray(item.options) || !item.options.length || item.options.length > 100) fail('Each attribute needs 1–100 options');
    const options = item.options.map(option => {
      if (typeof option !== 'string' || !option.trim() || option.length > 80) fail('Options must be non-empty text of at most 80 characters');
      return option.trim();
    });
    if (new Set(options).size !== options.length) fail('Options must be unique');
    const scope=item.scope || 'variant';
    if(!['product','variant'].includes(scope))fail('Attribute scope must be product or variant');
    return {key:item.key,label:item.label.trim(),options,scope};
  });
}
function values(input, defs, scope) {
  if (!input || Array.isArray(input) || typeof input !== 'object') fail('Attribute values must be an object');
  const output = {};
  for (const [key, selected] of Object.entries(input)) {
    const def = defs.find(item => item.key === key);
    if (!def || (scope && (def.scope||'variant')!==scope) || !Array.isArray(selected) || selected.some(option => !def.options.includes(option))) fail('An attribute or option is not configured for this category and scope');
    if (selected.length) output[key] = [...new Set(selected)];
  }
  return output;
}
module.exports = { definitions, values };
