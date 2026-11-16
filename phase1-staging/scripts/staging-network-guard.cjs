// Loaded before backend dependencies. Staging may connect only to its own local
// database/API. Applies to Node HTTP clients, fetch and raw TCP connections.
const net=require('node:net');
if(process.env.APP_ENV!=='staging'||process.env.DB_HOST!=='127.0.0.1'||process.env.DB_PORT!=='13307'||process.env.DB_NAME!=='littora_phase1_staging'){
 throw Error('Refusing startup: isolated staging database settings required');
}
const original=net.Socket.prototype.connect;
net.Socket.prototype.connect=function(...args){
 const input=Array.isArray(args[0])?args[0]:args;
 const options=input[0];
 const host=typeof options==='object'?(options.host||'localhost'):(typeof input[1]==='string'?input[1]:'localhost');
 const port=typeof options==='object'?options.port:options;
 if(!['127.0.0.1','::1','localhost'].includes(host)||![13307,15001].includes(Number(port))||options?.path){
  const error=Error('Staging blocked an outbound connection outside its test database/API');
  error.code='STAGING_EGRESS_BLOCKED';throw error;
 }
 return original.apply(this,args);
};
