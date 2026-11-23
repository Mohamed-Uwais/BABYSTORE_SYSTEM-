const test=require('node:test');
const assert=require('node:assert/strict');
const allocate=require('../src/utils/allocateTender');
const pay=(payment_method,amount)=>({payment_method,amount});
test('Rs 5000 tender on 4675 bill retains 4675',()=>{
  const [p]=allocate([pay('cash',5000)],4675);
  assert.equal(p.amount,4675); assert.equal(p.cash_tendered,5000);
});
test('split change is taken only from cash',()=>{
  const [card,cash]=allocate([pay('card',2000),pay('cash',3000)],4675);
  assert.equal(card.amount,2000);assert.equal(cash.amount,2675);
  assert.throws(()=>allocate([pay('card',4700),pay('cash',300)],4675));
  assert.throws(()=>allocate([pay('cash',4674.99)],4675));
});
