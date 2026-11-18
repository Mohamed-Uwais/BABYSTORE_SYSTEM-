// Staging-only parity preparation. No SQL from the VPS is executed wholesale.
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),runtime=path.join(root,'.staging');
const mysql=require('../backend/node_modules/mysql2/promise');
const bcrypt=require('../backend/node_modules/bcrypt');
const meta=JSON.parse(fs.readFileSync(path.join(runtime,'instance.json'),'utf8'));
const config=Object.fromEntries(fs.readFileSync(path.join(runtime,'backend.env'),'utf8').split(/\r?\n/).filter(Boolean).map(line=>{const i=line.indexOf('=');return [line.slice(0,i),line.slice(i+1)];}));
async function main(){
 assert.equal(config.DB_HOST,'127.0.0.1');assert.equal(config.DB_PORT,'13307');assert.equal(config.DB_NAME,'littora_phase1_staging');
 if(fs.existsSync(path.join(runtime,'localhost-prepared.json')))throw Error('Localhost fixtures already prepared; refusing duplicate seed.');
 const db=await mysql.createConnection({host:config.DB_HOST,port:13307,user:config.DB_USER,password:config.DB_PASSWORD,database:config.DB_NAME});
 try{
  const [[identity]]=await db.query('SELECT DATABASE() AS db, @@port AS port, @@datadir AS directory');
  assert.equal(identity.db,meta.database);assert.equal(Number(identity.port),13307);assert.equal(path.resolve(identity.directory),path.resolve(meta.data_directory));
  for(const table of ['users','products','orders','customers']){
   const [[row]]=await db.query('SELECT COUNT(*) AS total FROM '+db.escapeId(table));assert.equal(Number(row.total),0,'Unexpected business/test rows in '+table);
  }
  // Verified-instance backup, before nontransactional DDL. Credentials remain in
  // an ignored option file, never command-line values or stdout.
  const backup=path.join(runtime,'before-localhost.sql');
  const fd=fs.openSync(backup,'wx',0o600);
  let result;
  try{result=spawnSync('C:/Program Files/MySQL/MySQL Server 8.0/bin/mysqldump.exe',[
   '--defaults-extra-file='+path.join(runtime,'mysql-client.cnf'),'--no-tablespaces','--set-gtid-purged=OFF','--column-statistics=0','--skip-lock-tables',config.DB_NAME
  ],{stdio:['ignore',fd,'pipe'],windowsHide:true});}finally{fs.closeSync(fd);}
  if(result.error||result.status!==0)throw Error('Staging backup failed; no parity changes applied');
  const live=fs.readFileSync(path.join(runtime,'imports/littora-schema-reviewed.sql'),'utf8');
  const creates=[...live.matchAll(/CREATE TABLE `([^`]+)` \(\n([\s\S]*?)\n\)([^;]*);/g)];
  assert.equal(creates.length,42);
  const [existing]=await db.query('SHOW TABLES');const names=new Set(existing.map(r=>Object.values(r)[0]));
  const actions=[];
  for(const table of creates){
   const name=table[1];
   if(!names.has(name)){
    assert.ok(['expense_categories','expenses','google_reviews'].includes(name));
    await db.query(table[0].replace(/ AUTO_INCREMENT=\d+/g,''));actions.push('Added '+name);continue;
   }
   const [columns]=await db.query('SHOW COLUMNS FROM '+db.escapeId(name));const fields=new Set(columns.map(c=>c.Field));
   for(const line of table[2].split('\n')){
    const column=/^\s*`([^`]+)` (.*?)(?:,)?$/.exec(line);
    if(!column||fields.has(column[1]))continue;
    await db.query('ALTER TABLE '+db.escapeId(name)+' ADD COLUMN '+line.trim().replace(/,$/,''));actions.push('Added '+name+'.'+column[1]);
   }
  }
  // Website-critical existing definitions, copied from the reviewed schema.
  for(const [tableName,columnName] of [['orders','status'],['blog_posts','excerpt'],['product_images','sort_order'],['product_images','is_primary']]){
   const table=creates.find(t=>t[1]===tableName);
   const line=table[2].split('\n').find(s=>s.trim().startsWith('`'+columnName+'` '));
   assert.ok(line);await db.query('ALTER TABLE '+db.escapeId(tableName)+' MODIFY COLUMN '+line.trim().replace(/,$/,''));actions.push('Aligned '+tableName+'.'+columnName);
  }
  const username='local_owner',password=crypto.randomBytes(18).toString('base64url');
  await db.beginTransaction();
  try{
   await db.query('INSERT INTO users (full_name, username, password_hash, role) VALUES (?, ?, ?, ?)', ['LOCAL TEST OWNER',username,await bcrypt.hash(password,10),'owner']);
   const [category]=await db.query('INSERT INTO categories (name, slug) VALUES (?, ?)', ['LOCAL TEST Diapers','local-test-diapers']);
   const [brand]=await db.query('INSERT INTO brands (name, slug) VALUES (?, ?)', ['LOCAL TEST Brand','local-test-brand']);
   const [product]=await db.query('INSERT INTO products (name, slug, category_id, brand_id, description) VALUES (?, ?, ?, ?, ?)', ['LOCAL TEST Diapers M','local-test-diapers-m',category.insertId,brand.insertId,'Fictional product for localhost testing only.']);
   await db.query('INSERT INTO product_variants (product_id, sku, variant_label, retail_price, cost_price, current_stock) VALUES (?, ?, ?, ?, ?, ?)', [product.insertId,'LOCAL-TEST-M','M / 30 pieces',1500,1000,10]);
   await db.commit();
  }catch(error){await db.rollback();throw error;}
  fs.writeFileSync(path.join(runtime,'test-account.json'),JSON.stringify({username,password,scope:'LOCAL TEST ONLY; never use on production'},null,2),{mode:0o600});
  fs.writeFileSync(path.join(runtime,'localhost-prepared.json'),JSON.stringify({prepared_at:new Date().toISOString(),actions,backup,synthetic_only:true},null,2));
  console.log('Local staging prepared. Backup saved; fictional catalogue and test owner created. Credentials are in ignored .staging/test-account.json, not printed.');
 }finally{await db.end();}
}
main().catch(error=>{console.error('Local staging preparation failed:',error.code||error.message);process.exitCode=1;});
