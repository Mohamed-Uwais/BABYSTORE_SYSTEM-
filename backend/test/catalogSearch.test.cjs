const { test } = require('node:test');
const assert = require('node:assert/strict');
const { matchingProductIds } = require('../src/utils/catalogSearch');
const rows = [{id:1,name:'Premium Diapers',brand_name:'Example',category_name:'Baby care'}, {id:2,name:'Flower Vase',category_name:'Décor'}];
test('search supports partial names, spelling errors and combined words', () => {
  for (const query of ['diapr', 'diap', 'example diapr', 'premum diapers']) assert.deepEqual(matchingProductIds(rows, query), [1]);
  assert.deepEqual(matchingProductIds(rows, 'flowr'), [2]);
  assert.deepEqual(matchingProductIds(rows, 'flower diapers'), []);
  assert.deepEqual(matchingProductIds(rows, 'zzzz'), []);
  assert.deepEqual(matchingProductIds(rows, ''), []);
});
