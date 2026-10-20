import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filterInventoryGroups } from '../src/utils/inventorySearch.js';
import { normalizeDataHealthReport } from '../src/utils/dataHealthReport.js';

const groups = [
  { id: 10, name: 'PRETTY BABY Budget Pack', variants: [
    { id: 10, variant_id: 99, sku: 'LTPBPL30', barcode: '123456', variant_label: 'L' },
    { id: 10, variant_id: 100, sku: 'LTPBPM30', variant_label: 'M' },
  ] },
  { id: 11, name: 'GLOBAL Diapers', variants: [{ id: 11, variant_id: 101, sku: 'LTGII' }] },
];
test('inventory finds SKU prefixes, full SKUs, names and barcodes without product_id in API rows', () => {
  for (const query of ['ltpb', 'LTPBPL30', 'pretty baby', '123456']) {
    const found = filterInventoryGroups(groups, query);
    assert.deepEqual(found.map(p => p.id), [10]);
    assert.equal(found[0].variants.length, 2);
  }
  assert.deepEqual(filterInventoryGroups(groups, 'not-present'), []);
  assert.equal(filterInventoryGroups(groups, ' '), groups);
});
test('data health maps the current grouped API and keeps actual discrepancies', () => {
  const credit = [{ id: 1, drift: 20 }];
  const result = normalizeDataHealthReport({
    credit_balance: { rows: credit }, points_balance: { rows: [] },
    malformed_data: { rows: [{ type: 'negative_stock' }, { type: 'orphaned_payment', id: 4 }] },
  });
  assert.equal(result.credit_mismatches, credit);
  assert.deepEqual(result.points_mismatches, []);
  assert.deepEqual(result.orphaned_payments, [{ type: 'orphaned_payment', id: 4 }]);
});
test('data health accepts the legacy response but never reports malformed responses as clear', () => {
  const legacy = { credit_mismatches: [], points_mismatches: [], orphaned_payments: [] };
  assert.deepEqual(normalizeDataHealthReport(legacy), legacy);
  for (const data of [null, undefined, {}, { ...legacy, points_mismatches: null }, { ...legacy, credit_mismatches: [null] }]) {
    assert.throws(() => normalizeDataHealthReport(data), /Incomplete/);
  }
});
