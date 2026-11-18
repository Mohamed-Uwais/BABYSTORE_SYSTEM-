// Integration tests against the isolated API and DB only. Fixtures are removed
// by their generated IDs; no existing catalogue or stock is modified.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
(async()=>{
  const db=await require('./staging-connection.cjs').connect();
  const ids={variants:[]};
  const suffix=Date.now().toString(36);
  let token;
  async function api(route,method='GET',body,authenticated=false){
    const response=await fetch(`http://127.0.0.1:15001/api${route}`,{method,headers:{'Content-Type':'application/json',...(authenticated?{Authorization:`Bearer ${token}`}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(15000)});
    const data=await response.json();return {status:response.status,...data};
  }
  try {
    const account=await require('./staging-test-user.cjs').create(db);ids.user=account.id;
    const login=await api('/auth/login','POST',{username:account.username,password:account.password});
    assert.equal(login.status,200);token=login.data.token;
    const [category]=await db.query('INSERT INTO categories (name,slug) VALUES (?,?)',[`TEST Filters ${suffix}`,`test-filters-${suffix}`]);ids.category=category.insertId;
    const [product]=await db.query('INSERT INTO products (category_id,name,slug,show_on_website) VALUES (?,?,?,1)',[ids.category,`TEST Diapers ${suffix}`,`test-diapers-${suffix}`]);ids.product=product.insertId;
    for(const [label,price] of [['M Tape',100],['L Pant',200]]){
      const [variant]=await db.query('INSERT INTO product_variants (product_id,sku,variant_label,retail_price,current_stock) VALUES (?,?,?,?,5)',[ids.product,`${suffix}-${price}`,label,price]);ids.variants.push(variant.insertId);
    }
    const base=`/catalog/categories/${ids.category}`;
    assert.equal((await api(`${base}/filters`,'PUT',{definitions:[],expectedVersion:0})).status,401);
    const definitions=[{key:'size',label:'Size',options:['M','L']},{key:'type',label:'Type',options:['Tape','Pant']},{key:'material',label:'Material',scope:'product',options:['Cotton','Other']},{key:'pieces_per_pack',label:'Pieces per pack',options:['10','20']}];
    assert.equal((await api(`${base}/filters`,'PUT',{definitions,expectedVersion:0},true)).status,200);
    assert.equal((await api(`${base}/filters`,'PUT',{definitions,expectedVersion:0},true)).status,409);
    for(const [index,values] of [{size:['M'],type:['Tape'],pieces_per_pack:['10']},{size:['L'],type:['Pant'],pieces_per_pack:['20']}].entries())assert.equal((await api(`${base}/variants/${ids.variants[index]}/attributes`,'PUT',{values},true)).status,200);
    assert.equal((await api(`${base}/filters`,'PUT',{definitions:[],expectedVersion:1},true)).status,400);
    assert.equal((await api(`/catalog/products/${ids.product}/content`,'PUT',{attribute_values:{material:['Cotton']},media:[],specifications:'Synthetic specifications'},true)).status,200);
    const categoryName=`TEST Filters ${suffix}`;
    async function products(values={},extra={}){
      const query=new URLSearchParams({category:categoryName,view:'card',attributes:JSON.stringify(values),...extra});
      const result=await api(`/public/products?${query}`);assert.equal(result.status,200,JSON.stringify(result));return result.data;
    }
    assert.equal((await products({size:['M'],type:['Tape']})).total,1);
    assert.equal((await products({size:['M'],type:['Pant']})).total,0,'must not match across different variants');
    assert.equal((await products({material:['Cotton'],size:['M'],type:['Tape']})).total,1,'product attributes need only one assignment');
    assert.equal((await products({material:['Cotton'],size:['M'],type:['Pant']})).total,0);
    assert.equal((await products({material:['Other']})).total,0);
    const filtered=(await products({size:['L']})).products[0];
    assert.equal(Number(filtered.variant_id),ids.variants[1]);
    assert.equal(Number(filtered.retail_price),200,'card price and identity must describe the matching variant');
    assert.equal(Number(filtered.pieces_per_pack),20);
    const destination=(await db.query('INSERT INTO categories (name,slug) VALUES (?,?)',[`TEST Destination ${suffix}`,`destination-${suffix}`]))[0];ids.destination=destination.insertId;
    const move=await api(`/products/${ids.product}`,'PUT',{category_id:ids.destination,name:`TEST Diapers ${suffix}`,is_active:true},true);
    assert.equal(move.status,409,'incompatible category move must preserve existing assignments');
    const [[preserved]]=await db.query('SELECT category_id FROM products WHERE id=?',[ids.product]);assert.equal(preserved.category_id,ids.category);
    assert.equal((await products({size:['M','L'],type:['Pant']})).total,1);
    assert.equal((await products({size:['L']},{maxPrice:'150'})).total,0);
    await db.query("UPDATE product_variants SET discount_type='amount',discount_value=75 WHERE id=?",[ids.variants[1]]);
    assert.equal(Number((await products({size:['L']},{maxPrice:'150'})).products[0].discounted_price),125,'filters use actual selling price');
    assert.equal((await products({}, {search:`diapr ${suffix}`})).total,1);
    assert.equal((await api(`/public/products/test-diapers-${suffix}`)).status,200);
    const sitemap=await fetch('http://127.0.0.1:15001/api/public/sitemap.xml');
    assert.equal(sitemap.status,200);assert.match(sitemap.headers.get('content-type'),/xml/);
    const xml=await sitemap.text();assert.ok(xml.includes(`https://littora.lk/product/test-diapers-${suffix}`));assert.ok(!xml.includes('/checkout'));
    await db.query('UPDATE product_variants SET current_stock=0 WHERE product_id=?',[ids.product]);
    assert.equal((await products()).total,0);
    assert.equal((await api(`/public/products/test-diapers-${suffix}`)).status,404);
    await db.query('UPDATE products SET show_on_website=0 WHERE id=?',[ids.product]);
    await db.query('UPDATE product_variants SET current_stock=5 WHERE product_id=?',[ids.product]);
    assert.equal((await products()).total,0,'restock cannot override manual hiding');
    assert.ok(!(await (await fetch('http://127.0.0.1:15001/api/public/sitemap.xml')).text()).includes(`test-diapers-${suffix}`));
    await db.query('UPDATE products SET show_on_website=1 WHERE id=?',[ids.product]);
    assert.equal((await products()).total,1);
    const invalidPhone=await api('/public/checkout','POST',{phone:'0111234567',items:[{variantId:ids.variants[0],qty:1}]});
    assert.equal(invalidPhone.status,400);
    console.log('PASS: authenticated POS definitions/assignments, stale-edit conflict, option protection, AND/OR filters on the same variant, price combination, typo search, visibility/restock/direct URLs, invalid checkout phone.');
  } finally {
    try {
    if(ids.variants.length)await db.query('DELETE FROM website_variant_attributes WHERE variant_id IN (?)',[ids.variants]);
    if(ids.product)await db.query('DELETE FROM products WHERE id=?',[ids.product]);
    if(ids.category){await db.query('DELETE FROM website_category_filters WHERE category_id=?',[ids.category]);await db.query('DELETE FROM categories WHERE id=?',[ids.category]);}
    if(ids.destination)await db.query('DELETE FROM categories WHERE id=?',[ids.destination]);
    if(ids.user)await db.query('DELETE FROM users WHERE id=?',[ids.user]);
    } finally {await db.end();}
  }
})().catch(error=>{console.error(error.message);process.exitCode=1;});
