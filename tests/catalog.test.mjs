import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSetItems, productCatalog } from '../lib/catalog.js';

test('set Bigbus: semua 21 produk, 1 per set', () => {
  const items = buildSetItems('BIGBUS JB5', 1);
  assert.equal(items.length, 21); assert.ok(items.every(i => i.qty === 1));
});

test('set Medium: 20 produk, partisi 3 per set, kelipatan jumlah set', () => {
  const one = buildSetItems('MEDIUM JB5', 1);
  assert.equal(one.length, 20);
  assert.equal(one.find(i => i.name === 'PARTISI MEDIUM').qty, 3);
  const two = buildSetItems('MEDIUM JB5', 2);
  assert.equal(two.find(i => i.name === 'PARTISI MEDIUM').qty, 6);
  assert.equal(two.find(i => i.name === 'INNER C').qty, 2);
});

test('jumlah set tidak valid jatuh ke 1; model asing menghasilkan kosong', () => {
  assert.equal(buildSetItems('MEDIUM JB5', 0)[0].qty, 1);
  assert.deepEqual(buildSetItems('LAIN', 1), []);
  assert.equal(productCatalog.length, 41);
});
