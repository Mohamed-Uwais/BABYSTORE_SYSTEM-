const escape=value=>String(value).replace(/[<>&"']/g,char=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[char]));
async function render(db){
 const content=await require('../models/contentModel').getAll();
 const paths=['/','/shop','/about','/contact','/blog'];
 for(const key of ['faq','privacy','returns','shipping','terms'])if(content.pages?.[key]?.body||content.pages?.[key]?.faqs?.length)paths.push(key==='faq'?'/faq':`/policies/${key}`);
 const [products]=await db.query(`SELECT p.slug FROM products p WHERE p.is_active=1 AND p.show_on_website=1 AND EXISTS (
  SELECT 1 FROM product_variants v WHERE v.product_id=p.id AND v.is_active=1 AND v.current_stock>COALESCE((SELECT SUM(quantity) FROM website_stock_reservations WHERE variant_id=v.id AND state='active'),0))`);
 for(const product of products)paths.push(`/product/${encodeURIComponent(product.slug)}`);
 const [base]=await db.query('SELECT slug,created_at FROM blog_posts WHERE is_published=1 OR slug IN (?)',[(content.articles?.items||[]).filter(item=>item.enabled).map(item=>item.slug).concat('')]);
 for(const post of require('./websiteArticles').list(base,content.articles?.items))paths.push(`/blog/${encodeURIComponent(post.slug)}`);
 return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${[...new Set(paths)].map(path=>`<url><loc>${escape('https://littora.lk'+path)}</loc></url>`).join('')}</urlset>`;
}
module.exports={render};
