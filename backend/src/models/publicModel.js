const db = require('../config/db');
const imageModel = require('./productImageModel');
const sellableStock=alias=>`(${alias}.current_stock-COALESCE((SELECT SUM(hold.quantity) FROM website_stock_reservations hold WHERE hold.variant_id=${alias}.id AND hold.state='active'),0))`;
const sellingPrice=`(CASE WHEN pv.discount_type='percent' THEN ROUND(pv.retail_price*(1-pv.discount_value/100),2) WHEN pv.discount_type='amount' THEN GREATEST(pv.retail_price-pv.discount_value,0) ELSE pv.retail_price END)`;

// Manual visibility is never changed by stock updates. A product can be shown
// only while at least one active variant is sellable; details retain sold-out
// variants so customers can see which options are unavailable.
const sellableProduct = `p.is_active = TRUE AND p.show_on_website = TRUE
  AND EXISTS (SELECT 1 FROM product_variants available
    WHERE available.product_id = p.id AND available.is_active = TRUE AND ${sellableStock('available')} > 0)`;

async function getProducts({ category, brand, minPrice, maxPrice, inStock, onSale, sort, search, view, attributes, limit = 24, offset = 0 }, suggestedIds = null) {
  limit = Math.max(1, Math.min(1000, Number.parseInt(limit, 10) || 24));
  offset = Math.max(0, Number.parseInt(offset, 10) || 0);
  const compact = view === 'card';
  let where = `${sellableProduct} AND pv.is_active = TRUE AND ${sellableStock('pv')} > 0`;
  const params = [];

  if (category) { where += ' AND c.name = ?'; params.push(category); }
  if (attributes && category) {
    let selected;
    try { selected = JSON.parse(attributes); } catch { throw Object.assign(new Error('Invalid filters'), {status:400}); }
    const [[row]] = await db.query('SELECT id FROM categories WHERE name=?', [category]);
    const defs = row ? (await require('./catalogAttributesModel').read(row.id)).definitions : [];
    const values = require('../services/catalogAttributes').values(selected, defs);
    for (const [key, options] of Object.entries(values)) {
      const productScope=defs.find(def=>def.key===key)?.scope==='product';
      where += ` AND EXISTS (SELECT 1 FROM ${productScope?'website_product_content':'website_variant_attributes'} va WHERE ${productScope?'va.product_id=p.id':'va.variant_id=pv.id'} AND (${options.map(()=> 'JSON_CONTAINS(va.attribute_values, ?, ?)').join(' OR ')}))`;
      for (const option of options) params.push(JSON.stringify(option), `$.${key}`);
    }
  }
  if (brand) { where += ' AND b.name = ?'; params.push(brand); }
  for(const [value,operator] of [[minPrice,'>='],[maxPrice,'<=']])if(value!==undefined&&value!==''){
    if(!Number.isFinite(Number(value))||Number(value)<0)throw Object.assign(new Error('Invalid price filter'),{status:400});
    where+=` AND ${sellingPrice} ${operator} ?`;params.push(Number(value));
  }
  if (inStock === 'true') { where += ` AND ${sellableStock('pv')} > 0`; }
  if (onSale === 'true') { where += " AND pv.discount_type != 'none' AND pv.discount_value > 0"; }
  if (suggestedIds) {
    where += ' AND p.id IN (?)';
    params.push(suggestedIds);
  } else if (search) {
    where += ' AND (p.name LIKE ? OR b.name LIKE ? OR c.name LIKE ? OR pv.sku LIKE ?)';
    const q = `%${search}%`;
    params.push(q, q, q, q);
  }

  let orderBy = 'p.created_at DESC';
  if (sort === 'price_asc') orderBy = `MIN(${sellingPrice}) ASC`;
  else if (sort === 'price_desc') orderBy = `MIN(${sellingPrice}) DESC`;
  else if (sort === 'best_selling') orderBy = 'units_sold DESC';
  else if (sort === 'newest') orderBy = 'p.created_at DESC';

  const countSQL = `
    SELECT COUNT(DISTINCT p.id) AS total
    FROM products p
    JOIN product_variants pv ON pv.product_id = p.id
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN brands b ON p.brand_id = b.id
    WHERE ${where}
  `;
  const [[{ total }]] = await db.query(countSQL, params);

  if (!Number(total) && search && !suggestedIds) {
    // Read only visible catalogue metadata. Never fuzzy-match hidden products.
    const [candidates] = await db.query(`SELECT p.id, p.name, b.name AS brand_name, c.name AS category_name
      FROM products p LEFT JOIN brands b ON b.id = p.brand_id
      LEFT JOIN categories c ON c.id = p.category_id WHERE ${sellableProduct}`);
    const ids = require('../utils/catalogSearch').matchingProductIds(candidates, String(search).slice(0, 120));
    if (ids.length) {
      const result = await getProducts({category, brand, minPrice, maxPrice, inStock, onSale, sort, view, attributes, limit, offset}, ids);
      return { ...result, suggested: true, searchTerm: String(search).slice(0, 120) };
    }
  }

  const dataSQL = `
    SELECT
      p.id, p.name, p.slug, p.category_id, p.brand_id, p.created_at, ${compact ? '' : 'p.description,'}
      c.name AS category_name, b.name AS brand_name,
      MIN(pv.id) AS variant_id,
      MIN(pv.variant_label) AS variant_label,
      MIN(pv.retail_price) AS retail_price,
      MIN(pv.mrp) AS mrp,
      MIN(pv.image_url) AS image_url,
      MAX(CASE WHEN ${sellableStock('pv')} > 0 THEN 1 ELSE 0 END) AS in_stock,
      COUNT(pv.id) AS variant_count,
      MAX(CASE WHEN pv.discount_type != 'none' AND pv.discount_value > 0 THEN 1 ELSE 0 END) AS on_sale,
      MIN(pv.discount_type) AS discount_type,
      MIN(pv.discount_value) AS discount_value,
      MAX(CASE
        WHEN pv.discount_type = 'percent' THEN ROUND(pv.retail_price * (1 - pv.discount_value / 100), 2)
        WHEN pv.discount_type = 'amount' THEN GREATEST(pv.retail_price - pv.discount_value, 0)
        ELSE pv.retail_price
      END) AS max_price,
      MIN(CASE
        WHEN pv.discount_type = 'percent' THEN ROUND(pv.retail_price * (1 - pv.discount_value / 100), 2)
        WHEN pv.discount_type = 'amount' THEN GREATEST(pv.retail_price - pv.discount_value, 0)
        ELSE pv.retail_price
      END) AS min_discounted_price,
      ${!compact || sort === 'best_selling' ? `COALESCE((SELECT SUM(oi.quantity) FROM order_items oi
                JOIN orders o ON o.id = oi.order_id
                WHERE oi.variant_id IN (SELECT sold.id FROM product_variants sold WHERE sold.product_id=p.id)
                AND o.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                AND o.status IN ('completed', 'delivered')), 0) AS units_sold,` : ''}
      (SELECT COUNT(*) > 0 FROM variant_price_tiers vpt WHERE vpt.variant_id = MIN(pv.id)) AS has_tiers
    FROM products p
    JOIN product_variants pv ON pv.product_id = p.id
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN brands b ON p.brand_id = b.id
    WHERE ${where}
    GROUP BY p.id
    ORDER BY ${orderBy}, p.id DESC
    LIMIT ? OFFSET ?
  `;

  const [products] = await db.query(dataSQL, [...params, Number(limit), Number(offset)]);

  const productIds = products.map(p => p.id);
  if(productIds.length){
    // Keep card identity, price, pack quantity and discount on the same eligible
    // variant. Independent MIN aggregates can combine different variants.
    const [rows]=await db.query(`SELECT * FROM (
      SELECT p.id AS product_id,pv.id AS variant_id,pv.variant_label,pv.retail_price,pv.mrp,pv.discount_type,pv.discount_value,pv.image_url,
        ${sellingPrice} AS discounted_price,
        COALESCE(JSON_UNQUOTE(JSON_EXTRACT(va.attribute_values,'$.pieces_per_pack[0]')),JSON_UNQUOTE(JSON_EXTRACT(pc.attribute_values,'$.pieces_per_pack[0]'))) AS pieces_per_pack,
        (SELECT COUNT(*) FROM product_variants allv WHERE allv.product_id=p.id AND allv.is_active=1) AS variant_count,
        (SELECT COUNT(*)>0 FROM variant_price_tiers tiers WHERE tiers.variant_id=pv.id) AS has_tiers,
        ROW_NUMBER() OVER (PARTITION BY p.id ORDER BY ${sellingPrice},pv.id) AS position
      FROM products p JOIN product_variants pv ON pv.product_id=p.id
      LEFT JOIN categories c ON c.id=p.category_id LEFT JOIN brands b ON b.id=p.brand_id
      LEFT JOIN website_variant_attributes va ON va.variant_id=pv.id LEFT JOIN website_product_content pc ON pc.product_id=p.id
      WHERE ${where} AND p.id IN (?)
    ) matching WHERE position=1`,[...params,productIds]);
    for(const product of products){
      const row=rows.find(value=>value.product_id===product.id);
      if(row){Object.assign(product,row);product.on_sale=Number(row.discounted_price)<Number(row.retail_price);product.min_discounted_price=row.discounted_price;}
    }
  }
  const imgMap = await imageModel.getImagesByProductIds(productIds);
  for (const p of products) {
    const imgs = imgMap[p.id] || [];
    if (imgs.length) {
      p.image_url = imgs[0].image_url;
      p.second_image_url = imgs[1]?.image_url || null;
    }
  }

  return { products, total, limit: Number(limit), offset: Number(offset) };
}

async function getProductBySlug(slug) {
  const [[product]] = await db.query(`
    SELECT p.id, p.name, p.slug, p.description,
           c.name AS category_name, b.name AS brand_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN brands b ON p.brand_id = b.id
    WHERE p.slug = ? AND ${sellableProduct}
  `, [slug]);
  if (!product) return null;

  const [variants] = await db.query(`
    SELECT id, variant_label, retail_price, mrp, image_url, ${sellableStock('pv')} AS current_stock,
           discount_type, discount_value,
           CASE
             WHEN discount_type = 'percent' THEN ROUND(retail_price * (1 - discount_value / 100), 2)
             WHEN discount_type = 'amount' THEN GREATEST(retail_price - discount_value, 0)
             ELSE retail_price
           END AS discounted_price,
           CASE WHEN ${sellableStock('pv')} > 0 THEN TRUE ELSE FALSE END AS in_stock,
           CASE WHEN ${sellableStock('pv')} > 0 AND ${sellableStock('pv')} < 10 THEN ${sellableStock('pv')} ELSE NULL END AS low_stock_warning
    FROM product_variants pv
    WHERE product_id = ? AND is_active = TRUE
    ORDER BY retail_price ASC
  `, [product.id]);

  // Fetch price tiers for all variants
  const variantIds = variants.map(v => v.id);
  let tierMap = {};
  if (variantIds.length) {
    const [tierRows] = await db.query(
      'SELECT * FROM variant_price_tiers WHERE variant_id IN (?) ORDER BY min_quantity ASC',
      [variantIds]
    );
    for (const t of tierRows) {
      if (!tierMap[t.variant_id]) tierMap[t.variant_id] = [];
      tierMap[t.variant_id].push(t);
    }
  }
  for (const v of variants) {
    v.price_tiers = tierMap[v.id] || [];
  }
  const productContent=await require('./websiteProductModel').read(product.id);
  const [attributeRows]=variantIds.length?await db.query('SELECT variant_id,attribute_values FROM website_variant_attributes WHERE variant_id IN (?)',[variantIds]):[[]];
  for(const variant of variants){
    const row=attributeRows.find(item=>item.variant_id===variant.id);
    variant.attributes={...productContent.attribute_values,...(typeof row?.attribute_values==='string'?JSON.parse(row.attribute_values):row?.attribute_values||{})};
  }

  const [tags] = await db.query(`
    SELECT t.id, t.name FROM product_tags pt JOIN tags t ON t.id = pt.tag_id WHERE pt.product_id = ?
  `, [product.id]);

  const [relatedIds]=await db.query(`SELECT p.id FROM products p
    WHERE p.category_id=(SELECT category_id FROM products WHERE id=?) AND p.id<>? AND ${sellableProduct}
    ORDER BY p.created_at DESC,p.id DESC LIMIT 4`,[product.id,product.id]);
  const related=relatedIds.length?(await getProducts({view:'card',limit:4},relatedIds.map(row=>row.id))).products:[];

  const images = await imageModel.getImagesByProductId(product.id);

  return { ...product, variants, tags, related, images, ...productContent };
}

async function getCategories() {
  const [rows] = await db.query(`
    SELECT c.id, c.name, COUNT(DISTINCT p.id) AS product_count
    FROM categories c
    JOIN products p ON p.category_id = c.id AND ${sellableProduct}
    JOIN product_variants pv ON pv.product_id = p.id AND pv.is_active = TRUE
    GROUP BY c.id
    ORDER BY c.name
  `);
  return rows;
}

async function getBrands() {
  const [rows] = await db.query(`
    SELECT b.id, b.name, COUNT(DISTINCT p.id) AS product_count
    FROM brands b
    JOIN products p ON p.brand_id = b.id AND ${sellableProduct}
    JOIN product_variants pv ON pv.product_id = p.id AND pv.is_active = TRUE
    GROUP BY b.id
    ORDER BY b.name
  `);
  return rows;
}

async function getBestSellers(limit = 8) {
  return (await getProducts({sort:'best_selling',view:'card',limit})).products.filter(product=>Number(product.units_sold)>0);
}

async function getNewArrivals(limit = 8) {
  return (await getProducts({sort:'newest',view:'card',limit})).products;
}

async function getFeatured(document) {
  const content=document?.homepage||await require('./contentModel').getByKey('homepage');
  if(!content?.featured_slugs?.length)return getNewArrivals(8);
  const [rows]=await db.query('SELECT id,slug FROM products WHERE slug IN (?)',[content.featured_slugs]);
  if(!rows.length)return [];
  const result=await getProducts({view:'card',limit:24},rows.map(row=>row.id));
  return result.products.sort((a,b)=>content.featured_slugs.indexOf(a.slug)-content.featured_slugs.indexOf(b.slug));
}

async function trackOrder(orderNumber, phone) {
  const aliases = phone ? (await require('../utils/mobilePhone')).mobilePhoneAliases(phone) : [];
  if (!aliases.length) return null;
  const [[order]] = await db.query(`
    SELECT o.id, o.order_number, o.status, o.subtotal, o.discount_total,
           o.delivery_fee, o.grand_total, o.fulfillment_type, o.created_at
    FROM orders o
    LEFT JOIN customers c ON c.id = o.customer_id
    WHERE o.order_number = ?
      AND (? = '' OR REPLACE(REPLACE(c.phone, ' ', ''), '-', '') IN (?))
  `, [orderNumber, phone, aliases.length ? aliases : ['']]);
  if (!order) return null;

  const [items] = await db.query(`
    SELECT p.id AS product_id,p.slug,pv.id AS variant_id,p.name AS product_name, pv.variant_label, oi.quantity, oi.unit_price, oi.line_total
    FROM order_items oi
    JOIN product_variants pv ON pv.id = oi.variant_id
    JOIN products p ON p.id = pv.product_id
    WHERE oi.order_id = ?
  `, [order.id]);


  const [delivery] = await db.query(`
    SELECT od.tracking_number, od.delivery_status,
           cr.name AS courier_name, cr.tracking_url_template
    FROM order_deliveries od
    LEFT JOIN couriers cr ON cr.id = od.courier_id
    WHERE od.order_id = ?
  `, [order.id]);

  const [history] = await db.query(`
    SELECT status, created_at FROM order_status_history WHERE order_id = ? ORDER BY created_at DESC
  `, [order.id]);

  return { ...order, items, delivery: delivery[0] || null, history };
}

async function getStoreInfo() {
  const [[info]] = await db.query(`
    SELECT store_name, address_line1, address_line2, city, phone, email, logo_url, receipt_footer
    FROM store_settings WHERE id = 1
  `);
  return info || {};
}

async function getDeliveryZones() {
  const [rows] = await db.query('SELECT id, zone_name, base_fee, per_additional_pack_fee FROM delivery_zones WHERE is_active = TRUE ORDER BY zone_name');
  return rows;
}

async function saveContact({ name, phone, email, message }) {
  const [result] = await db.query(
    'INSERT INTO contact_messages (name, phone, email, message) VALUES (?, ?, ?, ?)',
    [name, phone || null, email || null, message]
  );
  return result.insertId;
}

// Blog
async function getBlogPosts({limit=12,offset=0}={},document) {
  const articles=(document?document.articles:await require('./contentModel').getByKey('articles'))||{items:[]};
  const [base]=await db.query(`SELECT id,title,slug,excerpt,cover_image_url AS cover_image,meta_description,created_at,
    CEIL(CHAR_LENGTH(content)/1000) AS read_time_min FROM blog_posts WHERE is_published=1 OR slug IN (?) ORDER BY created_at DESC`,[articles.items.filter(item=>item.enabled).map(item=>item.slug).concat('')]);
  const posts=require('../services/websiteArticles').list(base,articles.items);
  const start=Math.max(0,Number.parseInt(offset,10)||0),count=Math.max(1,Math.min(100,Number.parseInt(limit,10)||12));
  return {posts:posts.slice(start,start+count).map(({content_text,body,...post})=>post),total:posts.length};
}
async function getBlogPostBySlug(slug,document) {
  const articles=(document?document.articles:await require('./contentModel').getByKey('articles'))||{items:[]};
  const override=articles.items.find(item=>item.slug===slug);
  const [[post]]=await db.query(`SELECT id,title,slug,content,excerpt,cover_image_url AS cover_image,meta_description,created_at,
    CEIL(CHAR_LENGTH(content)/1000) AS read_time_min FROM blog_posts WHERE slug=? AND (is_published=1 OR ?=1)`,[slug,override?.enabled?1:0]);
  return require('../services/websiteArticles').merge(post||null,override);
}

module.exports = {
  getProducts, getProductBySlug, getCategories, getBrands,
  getBestSellers, getNewArrivals, getFeatured, trackOrder, getStoreInfo,
  getDeliveryZones, saveContact, getBlogPosts, getBlogPostBySlug,
};
