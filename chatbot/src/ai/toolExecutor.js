const db = require('../config/db');
const customerService = require('../services/customerService');
const orderService = require('../services/orderService');
const templates = require('../data/responseTemplates');
const logger = require('../utils/logger');

async function execute(toolName, args) {
  logger.debug(`Tool call: ${toolName}`, args);

  switch (toolName) {
    case 'search_products': return await searchProducts(args);
    case 'check_stock': return await checkStock(args);
    case 'get_customer': return await getCustomer(args);
    case 'create_order': return await createOrder(args);
    case 'get_order_status': return await getOrderStatus(args);
    case 'cancel_order': return await cancelOrder(args);
    case 'get_delivery_fee': return await getDeliveryFee(args);
    case 'get_active_promotions': return await getActivePromotions();
    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

const PUBLIC_BASE = process.env.PUBLIC_URL || 'https://pos.littora.lk';

function toPublicUrl(imageUrl) {
  if (!imageUrl) return null;
  if (imageUrl.startsWith('http')) return imageUrl;
  return PUBLIC_BASE + (imageUrl.startsWith('/') ? '' : '/') + imageUrl;
}

const STOP_WORDS = new Set([
  'i', 'want', 'need', 'buy', 'order', 'price', 'how', 'much', 'is', 'the',
  'a', 'an', 'of', 'for', 'me', 'you', 'do', 'have', 'got', 'please', 'can',
  'what', 'give', 'get', 'show', 'tell', 'some', 'any', 'this', 'that', 'it',
  'in', 'and', 'or', 'to', 'my', 'your', 'are', 'be', 'will', 'there',
  // Sinhala (Latin)
  'venum', 'kitta', 'illai', 'thiyenawada', 'ithinda', 'kiyada', 'gana',
  'ekak', 'eka', 'enna', 'mata', 'ona', 'thibba', 'hodai', 'mokakda',
  'karunakara', 'dannawada', 'thiyenawa',
  // Tamil (Latin)
  'enakku', 'irukka', 'evlo', 'kudunga', 'vendum', 'illa', 'sollunga',
  'romba', 'nalla', 'oru', 'enna', 'ethana',
]);

const SIZE_MAP = {
  'newborn': ['NB', 'newborn', 'new born'],
  'new born': ['NB', 'newborn', 'new born'],
  'nb': ['NB', 'newborn', 'new born'],
  'small': ['S', 'small'],
  's': ['S', 'small'],
  'medium': ['M', 'medium'],
  'm': ['M', 'medium'],
  'large': ['L', 'large'],
  'l': ['L', 'large'],
  'extra large': ['XL', 'extra large', 'x-large'],
  'x-large': ['XL', 'extra large', 'x-large'],
  'xl': ['XL', 'extra large', 'x-large'],
  'xxl': ['XXL', 'extra large'],
};

function tokenize(query) {
  return query.toLowerCase().replace(/[–—]/g, '-').split(/\s+/)
    .filter(t => t.length >= 2 && !STOP_WORDS.has(t));
}

function buildTokenConditions(tokens) {
  const searchField = "LOWER(CONCAT_WS(' ', p.name, pv.variant_label, b.name, c.name))";
  const conditions = [];
  const params = [];

  for (const token of tokens) {
    const sizeVariants = SIZE_MAP[token];
    if (sizeVariants) {
      const orParts = sizeVariants.map(() => `${searchField} LIKE ?`);
      conditions.push(`(${orParts.join(' OR ')})`);
      for (const sv of sizeVariants) params.push(`%${sv}%`);
    } else {
      // plural handling: try both with and without trailing 's'
      const base = token.endsWith('s') ? token.slice(0, -1) : null;
      if (base && base.length >= 2) {
        conditions.push(`(${searchField} LIKE ? OR ${searchField} LIKE ?)`);
        params.push(`%${token}%`, `%${base}%`);
      } else {
        const plural = token + 's';
        conditions.push(`(${searchField} LIKE ? OR ${searchField} LIKE ?)`);
        params.push(`%${token}%`, `%${plural}%`);
      }
    }
  }
  return { conditions, params };
}

async function fuzzySearch(tokens) {
  if (!tokens.length) return [];

  const baseSelect = `SELECT p.name AS product_name, p.slug, pv.id AS variant_id, pv.variant_label,
            pv.retail_price, pv.current_stock, pv.discount_type, pv.discount_value,
            pv.image_url, c.name AS category, b.name AS brand
     FROM product_variants pv
     JOIN products p ON p.id = pv.product_id
     LEFT JOIN categories c ON c.id = p.category_id
     LEFT JOIN brands b ON b.id = p.brand_id
     WHERE p.is_active = TRUE AND pv.is_active = TRUE`;

  // Try all tokens first
  for (let drop = 0; drop <= Math.min(tokens.length - 1, 2); drop++) {
    const subset = drop === 0 ? tokens : tokens.slice(0, tokens.length - drop);
    if (subset.length === 0) continue;

    const { conditions, params } = buildTokenConditions(subset);
    const sql = `${baseSelect} AND ${conditions.join(' AND ')} ORDER BY pv.current_stock DESC LIMIT 10`;
    const [rows] = await db.query(sql, params);
    if (rows.length > 0) return rows;
  }

  // Brand-only fallback: try first two tokens as a brand phrase
  if (tokens.length >= 2) {
    const brandPhrase = `%${tokens.slice(0, 2).join(' ')}%`;
    const [rows] = await db.query(
      `${baseSelect} AND (LOWER(p.name) LIKE ? OR LOWER(b.name) LIKE ?) ORDER BY pv.current_stock DESC LIMIT 10`,
      [brandPhrase, brandPhrase]
    );
    if (rows.length > 0) return rows;
  }

  // Single-token fallback for each remaining token
  for (const token of tokens) {
    if (STOP_WORDS.has(token)) continue;
    const { conditions, params } = buildTokenConditions([token]);
    const [rows] = await db.query(
      `${baseSelect} AND ${conditions.join(' AND ')} ORDER BY pv.current_stock DESC LIMIT 10`,
      params
    );
    if (rows.length > 0) return rows;
  }

  return [];
}

async function searchProducts({ query }) {
  const tokens = tokenize(query);
  logger.debug('Search tokens:', tokens, 'from query:', query);

  const rows = await fuzzySearch(tokens);

  const variantIds = rows.map(r => r.variant_id);
  let tierMap = {};
  if (variantIds.length) {
    const [tierRows] = await db.query(
      'SELECT * FROM variant_price_tiers WHERE variant_id IN (?) ORDER BY min_quantity ASC',
      [variantIds]
    );
    for (const t of tierRows) {
      if (!tierMap[t.variant_id]) tierMap[t.variant_id] = [];
      tierMap[t.variant_id].push({ qty: t.min_quantity, price: t.tier_price, label: t.label });
    }
  }

  return {
    products: rows.map(r => ({
      variant_id: r.variant_id,
      name: r.product_name,
      variant: r.variant_label,
      slug: r.slug,
      price: r.retail_price,
      discounted_price: templates.calcDiscounted(r),
      has_discount: r.discount_type && r.discount_type !== 'none' && r.discount_value > 0,
      in_stock: r.current_stock > 0,
      stock_qty: r.current_stock,
      category: r.category,
      brand: r.brand,
      image_url: toPublicUrl(r.image_url),
      website_link: r.slug ? `https://littora.lk/product/${r.slug}` : null,
      price_tiers: tierMap[r.variant_id] || [],
    })),
    count: rows.length,
    search_note: rows.length === 0 ? 'no_results' : undefined,
  };
}

async function checkStock({ variant_id }) {
  const [rows] = await db.query(
    `SELECT pv.current_stock, pv.variant_label, p.name AS product_name
     FROM product_variants pv JOIN products p ON p.id = pv.product_id
     WHERE pv.id = ?`,
    [variant_id]
  );
  if (rows.length === 0) return { error: 'Variant not found' };
  const r = rows[0];
  return { variant_id, name: r.product_name, variant: r.variant_label, in_stock: r.current_stock > 0, stock_qty: r.current_stock };
}

async function getCustomer({ phone }) {
  const customer = await customerService.findByPhone(phone);
  if (!customer) return { found: false };
  const recentOrders = await customerService.getRecentOrders(customer.id);
  return {
    found: true,
    name: customer.full_name,
    phone: customer.phone,
    address: customer.address,
    city: customer.city,
    loyalty_tier: customer.loyalty_tier,
    credit_balance: customer.credit_balance,
    recent_orders: recentOrders,
  };
}

async function createOrder({ customer_phone, customer_name, delivery_address, items, payment_method, notes }) {
  try {
    const customer = await customerService.findOrCreate(customer_phone, customer_name);
    if (delivery_address && customer.address !== delivery_address) {
      await db.query(`UPDATE customers SET address = ? WHERE id = ?`, [delivery_address, customer.id]);
    }
    const totalPacks = items.reduce((s, i) => s + (i.quantity || 1), 0);
    let deliveryFee = 0;
    if (delivery_address) {
      const [zones] = await db.query('SELECT base_fee, per_additional_pack_fee FROM delivery_zones WHERE is_active = TRUE ORDER BY base_fee LIMIT 1');
      if (zones.length) {
        const z = zones[0];
        deliveryFee = z.base_fee + Math.max(0, totalPacks - 1) * (z.per_additional_pack_fee || 100);
      }
    }
    const result = await orderService.createOrder({
      channel: 'whatsapp',
      customerId: customer.id,
      items,
      paymentMethod: payment_method,
      deliveryAddress: delivery_address,
      deliveryFee,
      notes,
    });
    return { success: true, order_number: result.orderNumber, grand_total: result.grandTotal, delivery_fee: deliveryFee };
  } catch (err) {
    logger.error('Create order failed:', err.message);
    return { success: false, error: err.message };
  }
}

async function getOrderStatus({ order_number }) {
  const order = await orderService.getOrderStatus(order_number);
  if (!order) return { found: false };
  return {
    found: true,
    order_number: order.order_number,
    status: order.status,
    total: order.grand_total,
    delivery_status: order.delivery_status,
    tracking_number: order.tracking_number,
  };
}

async function cancelOrder({ order_number }) {
  return await orderService.cancelOrder(order_number);
}

async function getDeliveryFee({ zone_name, total_packs }) {
  const packs = total_packs || 1;
  const [rows] = await db.query(
    `SELECT zone_name, base_fee, per_additional_pack_fee FROM delivery_zones WHERE is_active = TRUE AND zone_name LIKE ?`,
    [`%${zone_name}%`]
  );
  if (rows.length > 0) {
    return { zones: rows.map(r => {
      const packFee = r.per_additional_pack_fee || 100;
      const total = r.base_fee + Math.max(0, packs - 1) * packFee;
      return { name: r.zone_name, base_fee: r.base_fee, per_additional_pack_fee: packFee, total_packs: packs, total_fee: total };
    }) };
  }
  const [all] = await db.query(`SELECT zone_name, base_fee, per_additional_pack_fee FROM delivery_zones WHERE is_active = TRUE ORDER BY base_fee`);
  return { message: `Area "${zone_name}" not found. Available zones:`, zones: all.map(r => ({ name: r.zone_name, base_fee: r.base_fee })) };
}

async function getActivePromotions() {
  const [rows] = await db.query(
    `SELECT title, description, coupon_code, promo_type, discount_value, banner_text
     FROM promotions WHERE is_active = TRUE AND starts_at <= NOW() AND ends_at >= NOW()
     ORDER BY created_at DESC LIMIT 10`
  );
  return { promotions: rows, count: rows.length };
}

module.exports = { execute };
