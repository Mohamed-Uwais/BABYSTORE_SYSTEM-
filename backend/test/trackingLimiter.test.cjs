const {test}=require('node:test');
const assert=require('node:assert/strict');
test('tracking/repeat-order guessing is bounded by IP and resets after the window',()=>{
 let now=0,passed=0;const limiter=require('../src/middleware/trackingLimiter')({now:()=>now});
 const res={headers:{},setHeader(key,value){this.headers[key]=value;},status(value){this.code=value;return this;},json(){}};
 for(let i=0;i<31;i++)limiter({ip:'test-client'},res,()=>passed++);
 assert.equal(passed,30);assert.equal(res.code,429);assert.equal(res.headers['Retry-After'],'60');
 limiter({ip:'other-client'},res,()=>passed++);assert.equal(passed,31);
 now=60000;limiter({ip:'test-client'},res,()=>passed++);assert.equal(passed,32);
});
