// Cost evidence is never part of a cashier/operational response, including nested variants.
const privateFields = new Set(['cost_price', 'cost_price_snapshot', 'fifo_cost_total', 'unit_cost',
  'purchase_cost', 'landed_cost', 'latest_purchase_cost', 'next_fifo_cost', 'stock_value_cost',
  'gross_profit', 'net_profit', 'profit', 'margin', 'profit_margin']);
function withoutCosts(value) {
  if (Array.isArray(value)) return value.map(withoutCosts);
  if (!value || typeof value !== 'object' || value instanceof Date) return value;
  return Object.fromEntries(Object.entries(value).filter(([key]) => !privateFields.has(key)).map(([key,item]) => [key,withoutCosts(item)]));
}
function hideCosts(req,res,next) {
  if (!require('../middleware/salesScope').unrestricted(req.user)) {
    const json=res.json.bind(res);
    res.json=value=>json(withoutCosts(value));
  }
  next();
}
module.exports={withoutCosts,hideCosts};
