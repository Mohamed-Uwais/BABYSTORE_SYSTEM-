// Explicit opt-in integration check, independent of backend/.env and application startup.
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.resolve(process.argv[2]);
const dependencies=path.resolve(process.argv[3]);
const metadata=JSON.parse(fs.readFileSync(path.join(root,'.staging/instance.json'),'utf8'));
assert.equal(metadata.database,'littora_phase1_staging');assert.equal(metadata.port,13307);
const env=Object.fromEntries(fs.readFileSync(path.join(root,'.staging/backend.env'),'utf8').split(/\r?\n/).filter(Boolean).map(s=>{const i=s.indexOf('=');return [s.slice(0,i),s.slice(i+1)];}));
assert.equal(env.APP_ENV,'staging');assert.equal(env.DB_HOST,'127.0.0.1');assert.equal(env.DB_NAME,metadata.database);assert.equal(env.DB_PORT,'13307');
const mysql=require(require.resolve('mysql2/promise',{paths:[path.join(dependencies,'backend')]}));
const {createStudio}=require(path.join(root,'backend/src/services/websiteStudio'));
const {createRepository}=require(path.join(root,'backend/src/models/websiteStudioRepository'));
async function main(){
 const pool=mysql.createPool({host:env.DB_HOST,port:13307,user:env.DB_USER,password:env.DB_PASSWORD,database:env.DB_NAME,connectionLimit:3});
 try{
  const [[identity]]=await pool.query('SELECT DATABASE() AS db, @@port AS port, @@datadir AS dir');
  assert.equal(identity.db,metadata.database);assert.equal(Number(identity.port),13307);assert.equal(path.resolve(identity.dir),path.resolve(metadata.data_directory));
  const [[counts]]=await pool.query('SELECT (SELECT COUNT(*) FROM customers) AS customers, (SELECT COUNT(*) FROM orders) AS orders, (SELECT COUNT(*) FROM products) AS products');
  assert.deepEqual(Object.values(counts).map(Number),[0,0,0]);
  const service=createStudio(createRepository(pool));const initial=await service.read();
  assert.equal(initial.version,0);
  const results=await Promise.allSettled(['STAGING TEST A','STAGING TEST B'].map(headline=>service.saveSection({section:'hero',content:{headline},expectedVersion:0})));
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  assert.equal(results.find(r=>r.status==='rejected').reason.status,409);
  const [[before]]=await pool.query('SELECT COUNT(*) AS total FROM website_content');assert.equal(Number(before.total),0);
  const draft=await service.read();await service.publish({expectedVersion:draft.version});
  const revisions=await service.revisions();const baseline=revisions.find(r=>r.action==='before_publish');assert.ok(baseline);
  const state=await service.read();await service.restore({revisionId:Number(baseline.id),expectedVersion:state.version});
  assert.deepEqual((await service.read()).document,{});
  const [[published]]=await pool.query("SELECT content FROM website_content WHERE section_key='hero'");assert.ok(published);
  console.log('PASS: isolated MySQL identity, empty business tables, concurrent draft conflict, public draft isolation, publication history, restore-to-draft.');
  console.log('Only synthetic STAGING TEST content was written to the isolated test database; no app, payments or notifications ran.');
 }finally{await pool.end();}
}
main().catch(error=>{console.error('Staging integration check failed:',error.message);process.exitCode=1;});
