const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const runtime = path.join(root, '.print-test');
const fromBackend = require('node:module').createRequire(path.join(root, 'backend/package.json'));
const dbName = 'littora_print_test';
const dbOpts = {host:'127.0.0.1',port:13323,database:dbName};
async function main() {
  process.chdir(runtime);
  const db = await fromBackend('mysql2/promise').createConnection({...dbOpts,user:'root',password:fs.readFileSync('client.cnf','utf8').match(/^password=(.+)$/m)[1].trim()});
  try {
    const [[id]] = await db.query('SELECT @@datadir AS dir, DATABASE() AS db');
    if (path.resolve(id.dir) !== path.join(runtime,'api-data') || id.db !== dbName) throw Error('Unexpected test database');
    const ddl = fs.readFileSync(path.join(root,'database/full_schema.sql'),'utf8');
    await db.query('SET FOREIGN_KEY_CHECKS=0');
    for (const [sql] of ddl.matchAll(/^CREATE TABLE .*?;$/gms)) await db.query(sql.replace('CREATE TABLE','CREATE TABLE IF NOT EXISTS'));
    await db.query('SET FOREIGN_KEY_CHECKS=1');
    const privateFile = 'review-login.json';
    if (!fs.existsSync(privateFile)) fs.writeFileSync(privateFile, JSON.stringify({username:'print_reviewer',password:crypto.randomBytes(24).toString('hex')}));
    const account = JSON.parse(fs.readFileSync(privateFile));
    await db.execute("INSERT INTO users(full_name,username,password_hash,role) VALUES('Print Reviewer',?,?,'owner') ON DUPLICATE KEY UPDATE username=VALUES(username)",[account.username,await fromBackend('bcrypt').hash(account.password,10)]);
    const password=crypto.randomBytes(32).toString('hex');
    await db.query("CREATE USER IF NOT EXISTS 'print_app'@'127.0.0.1' IDENTIFIED BY ?",[password]);
    await db.query("ALTER USER 'print_app'@'127.0.0.1' IDENTIFIED BY ?",[password]);
    await db.query("GRANT SELECT, INSERT, UPDATE, DELETE ON littora_print_test.* TO 'print_app'@'127.0.0.1'");
    for(const line of fs.readFileSync(path.join(__dirname,'print-fixtures.sql'),'utf8').split(';').filter(s=>s.trim())) await db.query(line);
    const allowedEnv = ['SystemRoot','TEMP','TMP','PATH'];
    for(const key of Object.keys(process.env)) if(!allowedEnv.some(k=>k.toLowerCase()===key.toLowerCase())) delete process.env[key];
    Object.assign(process.env,{PORT:'15222',PRINT_REVIEW:'1',DB_HOST:dbOpts.host,DB_PORT:'13323',DB_NAME:dbName,DB_USER:'print_app',DB_PASSWORD:password,JWT_SECRET:crypto.randomBytes(40).toString('hex')});
  } finally {await db.end()}
  const net=require('node:net');
  const connect=net.Socket.prototype.connect;
  net.Socket.prototype.connect=function(...args){
    const o=Array.isArray(args[0])?args[0][0]:args[0];
    if(o?.host!=='127.0.0.1'||Number(o.port)!==13323) throw Error('Review mode blocks outbound integrations');
    return connect.apply(this,args);
  };
  require('../backend/src/server');
}
main().catch(e=>{console.error(e.code || e.message);process.exitCode=1});

