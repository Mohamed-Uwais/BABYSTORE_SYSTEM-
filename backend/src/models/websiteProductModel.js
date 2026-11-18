const db=require('../config/db');
const decode=value=>typeof value==='string'?JSON.parse(value):value;
async function read(productId){
  const [[row]]=await db.query('SELECT attribute_values,media,specifications FROM website_product_content WHERE product_id=?',[productId]);
  return row?{attribute_values:decode(row.attribute_values),media:decode(row.media),specifications:row.specifications||''}:{attribute_values:{},media:[],specifications:''};
}
async function save(productId,body){
  const media=require('../services/websiteMedia').media(body.media||[]);
  if(typeof body.specifications!=='string'||body.specifications.length>20000)throw Object.assign(new Error('Specifications must be text up to 20,000 characters'),{status:400});
  const connection=await db.getConnection();
  try{
    await connection.beginTransaction();
    const [[product]]=await connection.query('SELECT category_id FROM products WHERE id=?',[productId]);
    if(!product)throw Object.assign(new Error('Product not found'),{status:404});
    await connection.query('SELECT id FROM categories WHERE id=? FOR UPDATE',[product.category_id]);
    const [[locked]]=await connection.query('SELECT category_id FROM products WHERE id=? FOR UPDATE',[productId]);
    if(locked.category_id!==product.category_id)throw Object.assign(new Error('Product category changed. Reload.'),{status:409});
    const defs=(await require('./catalogAttributesModel').read(product.category_id,connection)).definitions;
    const values=require('../services/catalogAttributes').values(body.attribute_values||{},defs,'product');
    await connection.query(`INSERT INTO website_product_content (product_id,attribute_values,media,specifications) VALUES (?,?,?,?)
      ON DUPLICATE KEY UPDATE attribute_values=VALUES(attribute_values),media=VALUES(media),specifications=VALUES(specifications)`,[productId,JSON.stringify(values),JSON.stringify(media),body.specifications]);
    await connection.commit();return {attribute_values:values,media,specifications:body.specifications};
  }catch(error){await connection.rollback();throw error;}finally{connection.release();}
}
module.exports={read,save};
