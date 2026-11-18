// Read-only schema snapshot. Does not import SQL or read business table rows.
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const runtime=path.join(root,'.staging');
const meta=JSON.parse(fs.readFileSync(path.join(runtime,'instance.json'),'utf8'));
const env=Object.fromEntries(fs.readFileSync(path.join(runtime,'backend.env'),'utf8').split(/\r?\n/).filter(Boolean).map(line=>{const i=line.indexOf('=');return [line.slice(0,i),line.slice(i+1)];}));
assert.equal(env.DB_HOST,'127.0.0.1');assert.equal(env.DB_PORT,'13307');assert.equal(env.DB_NAME,'littora_phase1_staging');
const dependencies=process.argv[2]||root;
const mysql=require(require.resolve('mysql2/promise',{paths:[path.join(dependencies,'backend')]}));
(async()=>{
 const connection=await mysql.createConnection({host:env.DB_HOST,port:13307,user:env.DB_USER,password:env.DB_PASSWORD,database:env.DB_NAME,connectTimeout:5000});
 try{
  const [[identity]]=await connection.query('SELECT DATABASE() AS db, @@port AS port, @@datadir AS directory');
  assert.equal(identity.db,meta.database);assert.equal(Number(identity.port),13307);assert.equal(path.resolve(identity.directory),path.resolve(meta.data_directory));
  const [tables]=await connection.query("SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_TYPE='BASE TABLE' ORDER BY TABLE_NAME");
  const output=[];
  for(const table of tables){const [rows]=await connection.query('SHOW CREATE TABLE '+connection.escapeId(table.name));output.push(rows[0]['Create Table']+';');}
  fs.writeFileSync(path.join(runtime,'staging-schema.sql'),output.join('\n\n'),{mode:0o600});
  console.log('Read-only staging schema snapshot saved; '+tables.length+' table definitions. No business rows queried.');
 }finally{await connection.end();}
})().catch(error=>{console.error('Schema snapshot failed:',error.code||'IDENTITY_OR_CONFIG_CHECK_FAILED');process.exitCode=1;});
