const db = require('../config/db');
const { classify, extractOrderNumber, extractProductName } = require('./intentClassifier');
const customerService = require('../services/customerService');
const templates = require('../data/responseTemplates');
const greetings = require('../data/greetings');
const faq = require('../data/faqData');
const logger = require('../utils/logger');

const PUBLIC_BASE = process.env.PUBLIC_URL || 'https://pos.littora.lk';
function toPublicUrl(imageUrl) {
  if (!imageUrl) return null;
  if (imageUrl.startsWith('http')) return imageUrl;
  return PUBLIC_BASE + (imageUrl.startsWith('/') ? '' : '/') + imageUrl;
}

const FILLER_WORDS = new Set([
  'i', 'want', 'need', 'buy', 'order', 'looking', 'for', 'get', 'me', 'some',
  'any', 'the', 'a', 'an', 'of', 'please', 'pls', 'can', 'you', 'show', 'do',
  'have', 'got', 'give', 'what', 'is', 'are', 'there', 'how', 'much', 'about',
  'hi', 'hello', 'hey', 'ok', 'okay', 'yes', 'no', 'and', 'or', 'this', 'that',
  'im', 'its', 'it', 'like', 'just', 'also', 'too', 'my', 'ur', 'your',
]);

const SYNONYM_MAP = {
  'wipe': 'wet wipes', 'wipes': 'wet wipes', 'tissue': 'wet wipes', 'tissues': 'wet wipes',
  'nappy': 'diaper', 'nappies': 'diapers', 'pampers': 'diapers',
  'pant': 'pants', 'pull-up': 'pants', 'pullup': 'pants', 'pull-ups': 'pants',
  'bottle': 'feeding bottle', 'bottles': 'feeding bottle', 'feeder': 'feeding bottle',
  'pacifier': 'soother', 'dummy': 'soother', 'soothers': 'soother',
  'xl': 'extra large', 'xxl': 'extra extra large',
  'nb': 'newborn', 'new-born': 'newborn',
  's': 'small', 'm': 'medium', 'l': 'large',
  'cream': 'diaper cream', 'rash': 'diaper cream',
  'powder': 'baby powder', 'lotion': 'baby lotion', 'oil': 'baby oil',
  'shampoo': 'baby shampoo', 'soap': 'baby soap', 'wash': 'baby wash',
};

async function match(message, customer) {
  const intent = classify(message);

  if (intent) {
    try {
      switch (intent) {
        case 'greeting':      return await handleGreeting(customer);
        case 'thanks':        return result(intent, greetings.pick(greetings.THANKS_RESPONSES));
        case 'goodbye':       return result(intent, greetings.pick(greetings.GOODBYE_RESPONSES));
        case 'product_price': return await handleProductQuery(message, intent);
        case 'stock_check':   return await handleProductQuery(message, intent);
        case 'order_tracking': return await handleOrderTracking(message);
        case 'delivery_info': return await handleDeliveryInfo(message);
        case 'business_hours': return await handleBusinessHours();
        case 'contact_info':  return await handleContactInfo();
        case 'promotion':     return await handlePromotions();
        case 'cod_check':     return result(intent, faq.cod);
        case 'payment_methods': return result(intent, faq.payment_methods);
        case 'return_refund': return result(intent, faq.return_policy);
        case 'brands':        return result(intent, faq.brands);
        case 'bulk_order':    return result(intent, faq.bulk_order);
        default:              break;
      }
    } catch (err) {
      logger.error('Pattern matcher error:', err.message);
    }
  }

  // Catch-all: try direct product lookup from DB before falling to AI
  try {
    const productResult = await catchAllProductLookup(message);
    if (productResult) return productResult;
  } catch (err) {
    logger.error('Catch-all product lookup error:', err.message);
  }

  return null;
}

function result(intent, text, images) {
  return { intent, text, images: images || [], handledBy: 'pattern_matcher' };
}

async function handleGreeting(customer) {
  if (customer && customer.full_name) {
    const lastProduct = await customerService.getLastOrderProduct(customer.id);
    const tpl = greetings.pick(greetings.RETURNING_CUSTOMER);
    return result('greeting', tpl(customer.full_name, lastProduct));
  }
  return result('greeting', greetings.pick(greetings.NEW_CUSTOMER));
}

async function handleProductQuery(message, intent) {
  const productName = extractProductName(message);
  if (!productName) return null;

  const [variants] = await db.query(
    `SELECT p.name AS product_name, pv.variant_label, pv.retail_price, pv.current_stock,
            pv.discount_type, pv.discount_value, pv.image_url, pv.id AS variant_id
     FROM product_variants pv
     JOIN products p ON p.id = pv.product_id
     WHERE p.is_active = TRUE AND pv.is_active = TRUE
       AND (p.name LIKE ? OR pv.variant_label LIKE ? OR p.slug LIKE ?)
     ORDER BY pv.current_stock DESC
     LIMIT 5`,
    [`%${productName}%`, `%${productName}%`, `%${productName}%`]
  );

  if (variants.length === 0) return null;

  const intro = intent === 'stock_check'
    ? `Here's what we have for "${productName}"! 😊\n`
    : `Prices for "${productName}"! 😊\n`;

  const images = variants
    .filter(v => v.image_url)
    .slice(0, 3)
    .map(v => ({ url: toPublicUrl(v.image_url), caption: `${v.product_name} — ${templates.formatPrice(v.retail_price)}` }));

  return result(intent, templates.productList(variants, intro), images);
}

async function handleOrderTracking(message) {
  const orderNum = extractOrderNumber(message);
  if (!orderNum) return null;

  const [rows] = await db.query(
    `SELECT o.order_number, o.status, o.grand_total, o.created_at,
       od.delivery_status, od.tracking_number
     FROM orders o
     LEFT JOIN order_deliveries od ON od.order_id = o.id
     WHERE o.order_number = ?`,
    [orderNum]
  );

  if (rows.length === 0) {
    return result('order_tracking', `Hmm, I couldn't find order *${orderNum}* 🤔\nPlease double-check the order number and try again!`);
  }

  const o = rows[0];
  const statusEmoji = { pending: '⏳', confirmed: '✅', processing: '📦', shipped: '🚚', delivered: '✅', completed: '✅', cancelled: '❌' };
  let msg = `📋 *Order ${o.order_number}*\n\n`;
  msg += `Status: ${statusEmoji[o.status] || '📋'} ${o.status.charAt(0).toUpperCase() + o.status.slice(1)}\n`;
  msg += `Total: ${templates.formatPrice(o.grand_total)}\n`;
  if (o.tracking_number) msg += `Tracking: ${o.tracking_number}\n`;
  if (o.delivery_status) msg += `Delivery: ${o.delivery_status}\n`;

  return result('order_tracking', msg);
}

async function handleDeliveryInfo(message) {
  const [zones] = await db.query(
    `SELECT zone_name, base_fee FROM delivery_zones WHERE is_active = TRUE ORDER BY base_fee ASC`
  );

  if (zones.length === 0) {
    return result('delivery_info', "We deliver island-wide across Sri Lanka! 🚚\nDelivery fees vary by area. Tell me your city and I'll check the exact fee!");
  }

  let msg = "🚚 *Delivery Fees*\n\n";
  for (const z of zones) {
    msg += `📍 ${z.zone_name} — ${templates.formatPrice(z.base_fee)}\n`;
  }
  msg += `\nFree delivery on orders over Rs. 5,000! 🎉`;
  return result('delivery_info', msg);
}

async function handleBusinessHours() {
  const [rows] = await db.query(`SELECT * FROM store_settings WHERE id = 1`);
  const s = rows[0] || {};
  return result('business_hours',
    `We're open every day from 8 AM to 9 PM! 🕐\n📍 ${s.address_line1 || 'Colombo, Sri Lanka'}\n📞 ${s.phone || 'Contact us on WhatsApp!'}`
  );
}

async function handleContactInfo() {
  const [rows] = await db.query(`SELECT * FROM store_settings WHERE id = 1`);
  const s = rows[0] || {};
  let msg = '📞 *Contact Littora*\n\n';
  if (s.phone) msg += `📱 Phone: ${s.phone}\n`;
  if (s.email) msg += `📧 Email: ${s.email}\n`;
  if (s.address_line1) msg += `📍 Address: ${s.address_line1}`;
  if (s.city) msg += `, ${s.city}`;
  msg += '\n\nOr just chat with me right here! 😊';
  return result('contact_info', msg);
}

async function handlePromotions() {
  const [promos] = await db.query(
    `SELECT title, description, coupon_code, promo_type, discount_value, banner_text
     FROM promotions WHERE is_active = TRUE AND starts_at <= NOW() AND ends_at >= NOW()
     ORDER BY created_at DESC LIMIT 5`
  );

  if (promos.length === 0) {
    return result('promotion', "No special promotions running right now, but we always have great prices! 😊\nCheck out our shop for the latest deals!");
  }

  let msg = '🎉 *Current Deals*\n\n';
  for (const p of promos) {
    msg += templates.promotionCard(p) + '\n\n';
  }
  msg += 'Want to shop any of these?';
  return result('promotion', msg);
}

function expandSynonyms(tokens) {
  const expanded = [];
  for (const t of tokens) {
    if (SYNONYM_MAP[t]) {
      for (const word of SYNONYM_MAP[t].split(' ')) {
        if (!expanded.includes(word)) expanded.push(word);
      }
    } else {
      expanded.push(t);
    }
  }
  return expanded;
}

function buildSearchQuery(searchTokens) {
  const searchExpr = "LOWER(CONCAT_WS(' ', p.name, pv.variant_label, b.name, c.name))";
  const conditions = [];
  const params = [];
  for (const token of searchTokens) {
    const base = token.endsWith('s') && token.length > 3 ? token.slice(0, -1) : null;
    if (base) {
      conditions.push(`(${searchExpr} LIKE ? OR ${searchExpr} LIKE ?)`);
      params.push(`%${token}%`, `%${base}%`);
    } else {
      conditions.push(`${searchExpr} LIKE ?`);
      params.push(`%${token}%`);
    }
  }
  return { conditions, params };
}

async function catchAllProductLookup(message) {
  const raw = message.toLowerCase().replace(/[?!.,;:'"]/g, '').split(/\s+/)
    .filter(t => t.length >= 1 && !FILLER_WORDS.has(t));

  if (raw.length === 0) return null;

  const tokens = expandSynonyms(raw);
  logger.info(`[Catch-all] raw=[${raw.join(',')}] expanded=[${tokens.join(',')}]`);

  const baseSelect = `SELECT p.name AS product_name, pv.variant_label, pv.retail_price, pv.current_stock,
         pv.discount_type, pv.discount_value, pv.image_url, pv.id AS variant_id,
         b.name AS brand
    FROM product_variants pv
    JOIN products p ON p.id = pv.product_id
    LEFT JOIN categories c ON c.id = p.category_id
    LEFT JOIN brands b ON b.id = p.brand_id
    WHERE p.is_active = TRUE AND pv.is_active = TRUE`;

  async function search(searchTokens, label) {
    const { conditions, params } = buildSearchQuery(searchTokens);
    if (conditions.length === 0) return null;
    const sql = `${baseSelect} AND ${conditions.join(' AND ')} ORDER BY pv.current_stock DESC LIMIT 8`;
    const [rows] = await db.query(sql, params);
    if (rows.length > 0) {
      logger.info(`[Catch-all] ${label}: ${rows.length} results for [${searchTokens.join(', ')}]`);
      const images = rows.filter(v => v.image_url).slice(0, 3)
        .map(v => ({ url: toPublicUrl(v.image_url), caption: `${v.product_name} — ${templates.formatPrice(v.retail_price)}` }));
      return result('product_lookup', templates.productList(rows, `Here's what we have for "${raw.join(' ')}":\n`), images);
    }
    return null;
  }

  // 1. Try all expanded tokens together
  let r = await search(tokens, 'all-tokens');
  if (r) return r;

  // 2. Progressive drop: remove tokens from the end
  for (let drop = 1; drop <= Math.min(tokens.length - 1, 2); drop++) {
    r = await search(tokens.slice(0, tokens.length - drop), `drop-${drop}`);
    if (r) return r;
  }

  // 3. Single-token fallback (try each expanded token individually)
  for (const token of tokens) {
    r = await search([token], 'single');
    if (r) return r;
  }

  // 4. Also try original raw tokens individually (in case synonym expansion missed)
  for (const token of raw) {
    if (tokens.includes(token)) continue;
    r = await search([token], 'raw-single');
    if (r) return r;
  }

  return null;
}

module.exports = { match };
