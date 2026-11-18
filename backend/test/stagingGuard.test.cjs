const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../../scripts/staging-network-guard.cjs'),'utf8');
test('staging guard refuses live/default database configuration',()=>{
 assert.throws(()=>vm.runInNewContext(source,{require:()=>({Socket:{prototype:{}}}),process:{env:{APP_ENV:'production'}}}),/Refusing startup/);
});
test('staging guard blocks external services and wrong local ports before socket access',()=>{
 let calls=0;const socket={prototype:{connect:()=>{calls++;return 'allowed';}}};
 vm.runInNewContext(source,{require:()=>({Socket:socket}),process:{env:{APP_ENV:'staging',DB_HOST:'127.0.0.1',DB_PORT:'13307',DB_NAME:'littora_phase1_staging'}}});
 for(const options of [{host:'graph.facebook.com',port:443},{host:'127.0.0.1',port:3306},{host:'127.0.0.1',port:5001},{path:'mysql.sock'}])assert.throws(()=>socket.prototype.connect(options),e=>e.code==='STAGING_EGRESS_BLOCKED');
 assert.equal(calls,0);assert.equal(socket.prototype.connect({host:'127.0.0.1',port:13307}),'allowed');assert.equal(calls,1);
});
