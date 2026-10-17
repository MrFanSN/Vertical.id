import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Database SQLite sungguhan di memori + skema asli db/schema.sql, dibungkus agar menyerupai klien @libsql/client.
// Jika node:sqlite tidak tersedia (Node < 22.13), dipakai @libsql/client dengan database di memori.
const SCHEMA = readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8');
let calls = [];

async function newClient() {
  let sqlite = null;
  try { sqlite = await import('node:sqlite'); } catch { /* pakai libsql */ }
  if (!sqlite) {
    const { createClient } = await import('@libsql/client');
    const c = createClient({ url: ':memory:' });
    await c.executeMultiple(SCHEMA);
    return c;
  }
  const db = new sqlite.DatabaseSync(':memory:');
  db.exec(SCHEMA);
  return {
    async execute(stmt) {
      const { sql, args = [] } = typeof stmt === 'string' ? { sql: stmt } : stmt;
      calls.push(sql);
      const p = db.prepare(sql);
      if (/^\s*select/i.test(sql) || /\breturning\b/i.test(sql)) {
        const rows = p.all(...args).map(r => ({ ...r }));
        return { rows, rowsAffected: rows.length, columns: rows[0] ? Object.keys(rows[0]) : [] };
      }
      const r = p.run(...args); return { rows: [], rowsAffected: Number(r.changes) };
    },
  };
}

process.env.TURSO_DATABASE_URL = 'file:test-memori'; // hanya agar dianggap terkonfigurasi; klien diganti di bawah
const store = await import('../lib/server/store.js');
const list = await import('../app/api/orders/route.js');
const one = await import('../app/api/orders/[id]/route.js');

async function resetDb() { calls = []; store.useClient(await newClient()); }
const req = (method, body, headers = {}) => new Request('http://x/api/orders', { method, headers: { 'content-type': 'application/json', ...headers }, body: body ? JSON.stringify(body) : undefined });
const valid = () => ({ kind: 'eceran', orderDate: '2026-10-17', workStartDate: '2026-10-18', deliveryDate: '2026-10-31',
  items: [{ name: 'Kampas', qty: 2, unit: 'PC', checked: false }], history: [], approval: { state: 'draft' } });
// Next.js 15+ memberikan params sebagai Promise
const patch = (id, o, v) => one.PATCH(req('PATCH', { version: v, order: o }), { params: Promise.resolve({ id }) });
const dbRows = async () => (await store.listOrders());

test('belum dikonfigurasi → 503 agar klien jatuh ke mode lokal', async () => {
  const keep = process.env.TURSO_DATABASE_URL; delete process.env.TURSO_DATABASE_URL;
  assert.equal((await list.GET(req('GET'))).status, 503);
  process.env.TURSO_DATABASE_URL = keep;
});

test('URL remote tanpa token → 503; URL file: tanpa token boleh', async () => {
  const keep = process.env.TURSO_DATABASE_URL; delete process.env.TURSO_AUTH_TOKEN;
  process.env.TURSO_DATABASE_URL = 'libsql://contoh.turso.io';
  assert.equal(store.isConfigured(), false);
  assert.equal((await list.GET(req('GET'))).status, 503);
  process.env.TURSO_DATABASE_URL = 'file:lokal.db';
  assert.equal(store.isConfigured(), true);
  process.env.TURSO_DATABASE_URL = keep;
});

test('skema aman dijalankan berulang (idempotent)', async () => {
  const sqlite = await import('node:sqlite').catch(() => null);
  if (!sqlite) return;
  const db = new sqlite.DatabaseSync(':memory:');
  db.exec(SCHEMA); db.exec(SCHEMA);
  assert.equal(db.prepare("SELECT count(*) n FROM sqlite_master WHERE name='orders'").get().n, 1);
});

test('buat order: nomor otomatis berurutan, tidak ada PO', async () => {
  await resetDb();
  const a = await (await list.POST(req('POST', { order: valid() }))).json();
  const b = await (await list.POST(req('POST', { order: valid() }))).json();
  assert.equal(a.order.id, 'VER-001'); assert.equal(b.order.id, 'VER-002'); assert.equal(a.order.version, 1);
  const all = await (await list.GET(req('GET'))).json();
  assert.equal(all.orders.length, 2);
  assert.equal(all.orders[0].id, 'VER-002', 'terbaru di atas');
});

test('simpan bersamaan: nomor order unik dan tidak bentrok', async () => {
  await resetDb();
  const rs = await Promise.all(Array.from({ length: 8 }, () => list.POST(req('POST', { order: valid() }))));
  const ids = (await Promise.all(rs.map(r => r.json()))).map(j => j.order.id).sort();
  assert.deepEqual(ids, Array.from({ length: 8 }, (_, i) => 'VER-00' + (i + 1)));
});

test('nomor order di atas 999 tidak terpotong', async () => {
  await resetDb();
  const c = await newClient(); store.useClient(c);
  await c.execute({ sql: "INSERT INTO sqlite_sequence (name, seq) VALUES ('orders', ?)", args: [999] });
  const r = await (await list.POST(req('POST', { order: valid() }))).json();
  assert.equal(r.order.id, 'VER-1000');
  const up = await patch('VER-1000', { ...r.order, notes: 'ok' }, 1);
  assert.equal(up.status, 200);
});

test('order tidak valid ditolak 422 dan tidak tersimpan', async () => {
  await resetDb();
  const bad = { ...valid(), items: [{ name: '', qty: 0 }] };
  const r = await list.POST(req('POST', { order: bad }));
  assert.equal(r.status, 422); assert.equal((await dbRows()).length, 0);
});

test('field asing dibuang; teks dipotong', async () => {
  await resetDb();
  await list.POST(req('POST', { order: { ...valid(), isAdmin: true, notes: 'x'.repeat(5000) } }));
  const [row] = await dbRows();
  assert.equal(row.data.isAdmin, undefined); assert.equal(row.data.notes.length, 1000);
});

test('data tersimpan utuh: JSON bolak-balik, termasuk karakter khusus', async () => {
  await resetDb();
  const o = { ...valid(), notes: "Rem 'depan' \"kiri\" — 100% ✓\nbaris 2", customer: 'PT Contoh; DROP TABLE orders;--' };
  const c = await (await list.POST(req('POST', { order: o }))).json();
  const all = await (await list.GET(req('GET'))).json();
  assert.equal(all.orders[0].notes, o.notes); assert.equal(all.orders[0].customer, o.customer);
  assert.equal(all.orders.length, 1); assert.equal(c.order.id, all.orders[0].id);
});

test('update: versi naik; versi usang → 409 (tidak menimpa perubahan orang lain)', async () => {
  await resetDb();
  const c = await (await list.POST(req('POST', { order: valid() }))).json();
  const edit = { ...c.order, notes: 'A' };
  const r1 = await patch('VER-001', edit, 1); assert.equal(r1.status, 200); assert.equal((await r1.json()).order.version, 2);
  const r2 = await patch('VER-001', { ...edit, notes: 'B' }, 1); assert.equal(r2.status, 409);
  assert.equal((await dbRows())[0].data.notes, 'A');
});

test('update order yang tidak ada → 409, bukan error server', async () => {
  await resetDb();
  const r = await patch('VER-099', valid(), 1);
  assert.equal(r.status, 409);
});

test('update: approval/pengiriman tidak konsisten ditolak server', async () => {
  await resetDb();
  const c = await (await list.POST(req('POST', { order: valid() }))).json();
  const cheat = { ...c.order, sent: true, approval: { state: 'approved' } };
  const r = await patch('VER-001', cheat, 1);
  assert.equal(r.status, 422);
});

test('id path berbahaya ditolak sebelum menyentuh database', async () => {
  await resetDb();
  for (const bad of ['VER-1&select=*', 'VER-1 OR 1=1', "VER-1'; DROP TABLE orders;--", 'VER-', 'VER-12345678901']) {
    assert.equal((await patch(bad, valid(), 1)).status, 400, bad);
  }
  assert.equal(calls.length, 0);
});

test('ACCESS_CODE: tanpa kode 401, kode benar lolos', async () => {
  await resetDb(); process.env.ACCESS_CODE = 'rahasia';
  assert.equal((await list.GET(req('GET'))).status, 401);
  assert.equal((await list.GET(req('GET', null, { 'x-access-code': 'salah' }))).status, 401);
  assert.equal((await list.GET(req('GET', null, { 'x-access-code': 'rahasia!' }))).status, 401);
  assert.equal((await list.GET(req('GET', null, { 'x-access-code': 'rahasia' }))).status, 200);
  delete process.env.ACCESS_CODE;
});

test('token database tidak bocor ke respons, termasuk saat database error', async () => {
  process.env.TURSO_AUTH_TOKEN = 'token-rahasia-123';
  store.useClient({ async execute() { throw Object.assign(new Error('gagal: token-rahasia-123 ditolak'), { code: 'SERVER_ERROR' }); } });
  const quiet = console.error; console.error = () => {};
  try {
    const g = await list.GET(req('GET')); const p = await list.POST(req('POST', { order: valid() }));
    const u = await patch('VER-001', valid(), 1);
    for (const r of [g, p, u]) { assert.equal(r.status, 502); assert.ok(!(await r.text()).includes('token-rahasia')); }
  } finally { console.error = quiet; delete process.env.TURSO_AUTH_TOKEN; }
});
