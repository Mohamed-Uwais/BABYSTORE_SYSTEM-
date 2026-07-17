const db = require('../config/db');

function toMySQLDatetime(val) {
  if (!val) return val;
  const d = new Date(val);
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0') + ' ' +
    String(d.getHours()).padStart(2, '0') + ':' +
    String(d.getMinutes()).padStart(2, '0') + ':' +
    String(d.getSeconds()).padStart(2, '0');
}

async function list(filters = {}) {
  let where = '1=1';
  const params = [];

  if (filters.status === 'active') {
    where += ' AND p.is_active = 1 AND p.starts_at <= NOW() AND p.ends_at > NOW()';
  } else if (filters.status === 'scheduled') {
    where += ' AND p.is_active = 1 AND p.starts_at > NOW()';
  } else if (filters.status === 'expired') {
    where += ' AND (p.ends_at <= NOW() OR p.is_active = 0)';
  }

  if (filters.type) {
    where += ' AND p.promo_type = ?';
    params.push(filters.type);
  }

  const [rows] = await db.query(
    `SELECT p.*,
       u.full_name AS created_by_name,
       (SELECT COUNT(*) FROM promotion_usage pu WHERE pu.promotion_id = p.id) AS usage_count
     FROM promotions p
     LEFT JOIN users u ON u.id = p.created_by
     WHERE ${where}
     ORDER BY p.created_at DESC`,
    params
  );
  return rows;
}

async function getById(id) {
  const [[promo]] = await db.query('SELECT * FROM promotions WHERE id = ?', [id]);
  if (!promo) return null;

  const [targets] = await db.query('SELECT * FROM promotion_targets WHERE promotion_id = ?', [id]);
  const [bundleItems] = await db.query(
    `SELECT pbi.*, pv.variant_label, pv.retail_price, pv.sku,
       p.name AS product_name, p.slug
     FROM promotion_bundle_items pbi
     JOIN product_variants pv ON pv.id = pbi.variant_id
     JOIN products p ON p.id = pv.product_id
     WHERE pbi.promotion_id = ?`,
    [id]
  );

  promo.targets = targets;
  promo.bundle_items = bundleItems;
  return promo;
}

async function create(data) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [result] = await conn.query(
      `INSERT INTO promotions (title, description, promo_type, coupon_code, max_uses,
        discount_value, buy_quantity, get_quantity, bundle_price, min_order_amount,
        starts_at, ends_at, is_active, banner_text, banner_color, show_on_homepage, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.title, data.description || null, data.promo_type,
        data.coupon_code || null, data.max_uses || null,
        data.discount_value || null, data.buy_quantity || null,
        data.get_quantity || null, data.bundle_price || null,
        data.min_order_amount || null,
        toMySQLDatetime(data.starts_at), toMySQLDatetime(data.ends_at),
        data.is_active !== false ? 1 : 0,
        data.banner_text || null, data.banner_color || null,
        data.show_on_homepage ? 1 : 0,
        data.created_by || null,
      ]
    );
    const promoId = result.insertId;

    if (data.targets?.length) {
      for (const t of data.targets) {
        await conn.query(
          'INSERT INTO promotion_targets (promotion_id, target_type, target_id) VALUES (?, ?, ?)',
          [promoId, t.target_type, t.target_id || null]
        );
      }
    }

    if (data.bundle_items?.length) {
      for (const bi of data.bundle_items) {
        await conn.query(
          'INSERT INTO promotion_bundle_items (promotion_id, variant_id, quantity) VALUES (?, ?, ?)',
          [promoId, bi.variant_id, bi.quantity || 1]
        );
      }
    }

    await conn.commit();
    return { id: promoId };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function update(id, data) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    await conn.query(
      `UPDATE promotions SET title=?, description=?, promo_type=?, coupon_code=?, max_uses=?,
        discount_value=?, buy_quantity=?, get_quantity=?, bundle_price=?, min_order_amount=?,
        starts_at=?, ends_at=?, is_active=?, banner_text=?, banner_color=?, show_on_homepage=?
       WHERE id=?`,
      [
        data.title, data.description || null, data.promo_type,
        data.coupon_code || null, data.max_uses || null,
        data.discount_value || null, data.buy_quantity || null,
        data.get_quantity || null, data.bundle_price || null,
        data.min_order_amount || null,
        toMySQLDatetime(data.starts_at), toMySQLDatetime(data.ends_at),
        data.is_active !== false ? 1 : 0,
        data.banner_text || null, data.banner_color || null,
        data.show_on_homepage ? 1 : 0,
        id,
      ]
    );

    await conn.query('DELETE FROM promotion_targets WHERE promotion_id = ?', [id]);
    if (data.targets?.length) {
      for (const t of data.targets) {
        await conn.query(
          'INSERT INTO promotion_targets (promotion_id, target_type, target_id) VALUES (?, ?, ?)',
          [id, t.target_type, t.target_id || null]
        );
      }
    }

    await conn.query('DELETE FROM promotion_bundle_items WHERE promotion_id = ?', [id]);
    if (data.bundle_items?.length) {
      for (const bi of data.bundle_items) {
        await conn.query(
          'INSERT INTO promotion_bundle_items (promotion_id, variant_id, quantity) VALUES (?, ?, ?)',
          [id, bi.variant_id, bi.quantity || 1]
        );
      }
    }

    await conn.commit();
    return { id };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function remove(id) {
  await db.query('UPDATE promotions SET is_active = 0 WHERE id = ?', [id]);
}

async function getStats(id) {
  const [[promo]] = await db.query('SELECT title, promo_type, times_used FROM promotions WHERE id = ?', [id]);
  if (!promo) return null;

  const [[{ total_discount }]] = await db.query(
    'SELECT COALESCE(SUM(discount_applied), 0) AS total_discount FROM promotion_usage WHERE promotion_id = ?',
    [id]
  );
  const [[{ order_count }]] = await db.query(
    'SELECT COUNT(DISTINCT order_id) AS order_count FROM promotion_usage WHERE promotion_id = ?',
    [id]
  );
  const [recentUsage] = await db.query(
    `SELECT pu.*, o.order_number, c.full_name AS customer_name
     FROM promotion_usage pu
     LEFT JOIN orders o ON o.id = pu.order_id
     LEFT JOIN customers c ON c.id = pu.customer_id
     WHERE pu.promotion_id = ?
     ORDER BY pu.used_at DESC LIMIT 50`,
    [id]
  );

  return { ...promo, total_discount, order_count, recent_usage: recentUsage };
}

async function getActivePromotions() {
  const [promos] = await db.query(
    `SELECT p.*, GROUP_CONCAT(
       DISTINCT CONCAT(pt.target_type, ':', IFNULL(pt.target_id, ''))
     ) AS target_keys
     FROM promotions p
     LEFT JOIN promotion_targets pt ON pt.promotion_id = p.id
     WHERE p.is_active = 1 AND p.starts_at <= NOW() AND p.ends_at > NOW()
     GROUP BY p.id`
  );

  for (const p of promos) {
    p.targets = p.target_keys
      ? p.target_keys.split(',').map(k => {
          const [type, id] = k.split(':');
          return { target_type: type, target_id: id ? Number(id) : null };
        })
      : [];
    delete p.target_keys;

    if (p.promo_type === 'bundle_deal') {
      const [items] = await db.query(
        `SELECT pbi.variant_id, pbi.quantity, pv.retail_price, pv.variant_label,
           pr.name AS product_name
         FROM promotion_bundle_items pbi
         JOIN product_variants pv ON pv.id = pbi.variant_id
         JOIN products pr ON pr.id = pv.product_id
         WHERE pbi.promotion_id = ?`,
        [p.id]
      );
      p.bundle_items = items;
    }
  }

  return promos;
}

async function getHomepageBanners() {
  const [rows] = await db.query(
    `SELECT id, title, banner_text, banner_color, promo_type, discount_value, coupon_code
     FROM promotions
     WHERE is_active = 1 AND show_on_homepage = 1
       AND starts_at <= NOW() AND ends_at > NOW()
     ORDER BY created_at DESC`
  );
  return rows;
}

async function validateCoupon(code) {
  const [[promo]] = await db.query(
    `SELECT * FROM promotions
     WHERE coupon_code = ? AND is_active = 1
       AND starts_at <= NOW() AND ends_at > NOW()`,
    [code]
  );
  if (!promo) return { valid: false, message: 'Invalid or expired coupon code' };
  if (promo.max_uses && promo.times_used >= promo.max_uses) {
    return { valid: false, message: 'This coupon has reached its usage limit' };
  }

  const [targets] = await db.query(
    'SELECT * FROM promotion_targets WHERE promotion_id = ?', [promo.id]
  );
  promo.targets = targets;
  return { valid: true, promotion: promo };
}

async function recordUsage(promoId, orderId, customerId, discountApplied) {
  await db.query(
    `INSERT INTO promotion_usage (promotion_id, order_id, customer_id, discount_applied)
     VALUES (?, ?, ?, ?)`,
    [promoId, orderId, customerId || null, discountApplied]
  );
  await db.query(
    'UPDATE promotions SET times_used = times_used + 1 WHERE id = ?',
    [promoId]
  );
}

module.exports = {
  list, getById, create, update, remove, getStats,
  getActivePromotions, getHomepageBanners, validateCoupon, recordUsage,
};
