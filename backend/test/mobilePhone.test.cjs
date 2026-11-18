const { test } = require('node:test');
const assert = require('node:assert/strict');

test('all supported mobile formats normalize consistently without modifying historical data', async () => {
  const { normalizeMobilePhone, mobilePhoneAliases } = await import('../../shared/mobilePhone.mjs');
  for (const value of ['0771234567', '771234567', '+94771234567', '94771234567', ' 077 123-4567 ', '+94 77-123 4567']) {
    assert.equal(normalizeMobilePhone(value), '0771234567', value);
  }
  assert.deepEqual(mobilePhoneAliases('0771234567'), ['0771234567', '771234567', '94771234567', '+94771234567']);
});

test('rejects wrong prefixes, lengths, embedded text and malformed international formats', async () => {
  const { normalizeMobilePhone } = await import('../../shared/mobilePhone.mjs');
  for (const value of [null, undefined, 771234567, '', '0111234567', '671234567', '+91771234567', '9477123456', '07712345678', '00771234567', '+940771234567', '077ABC4567', '077/1234567', '++94771234567']) {
    assert.equal(normalizeMobilePhone(value), null, String(value));
  }
});
