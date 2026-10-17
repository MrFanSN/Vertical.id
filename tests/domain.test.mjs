import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../lib/domain.js';

const T = '2026-10-16';
const mk = (over = {}) => D.migrateOrder({ id: 'VER-001', po: 'PO-1', orderDate: '2026-10-01', deliveryDate: '2026-10-30',
  items: [{ name: 'A', qty: 1, checked: false }, { name: 'B', qty: 2, checked: false }], ...over });
const done = items => items.map(i => ({ ...i, checked: true }));

test('todayISO memakai WIB, bukan UTC', () => {
  assert.equal(D.todayISO(new Date('2026-10-16T18:00:00Z')), '2026-10-17'); // 01:00 WIB
  assert.equal(D.todayISO(new Date('2026-10-16T16:59:00Z')), '2026-10-16');
});

test('daysUntil: hari ini = 0, kemarin = -1, tanggal invalid = null', () => {
  assert.equal(D.daysUntil('2026-10-16', T), 0);
  assert.equal(D.daysUntil('2026-10-15', T), -1);
  assert.equal(D.daysUntil('2026-10-21', T), 5);
  assert.equal(D.daysUntil('', T), null);
});

test('progress: checklist kosong = 0, bukan 100', () => {
  assert.equal(D.progress(mk({ items: [] })), 0);
  assert.equal(D.isChecklistComplete(mk({ items: [] })), false);
});

test('progress dihitung dari checklist aktual', () => {
  const o = mk(); o.items[0].checked = true;
  assert.equal(D.progress(o), 50);
});

test('progress 100% tidak otomatis Approved', () => {
  const o = mk(); o.items = done(o.items);
  assert.equal(D.progress(o), 100);
  assert.notEqual(D.orderStatus(o, T), D.STATUS.DONE);
  assert.equal(D.orderStatus(o, T), D.STATUS.READY);
});

test('status: terlambat tidak sekaligus selesai', () => {
  const late = mk({ deliveryDate: '2026-10-10' });
  assert.equal(D.orderStatus(late, T), D.STATUS.OVERDUE);
  const approved = mk({ deliveryDate: '2026-10-10', sent: true, approval: { state: 'approved' } });
  approved.items = done(approved.items);
  assert.equal(D.orderStatus(approved, T), D.STATUS.DONE);
});

test('order dibatalkan: tidak dihitung terlambat maupun aktif', () => {
  const o = mk({ deliveryDate: '2026-10-01', cancelled: true });
  assert.equal(D.orderStatus(o, T), D.STATUS.CANCELLED);
  assert.deepEqual(D.buildAlerts([o], T), []);
  assert.equal(D.computeKpis([o], T).active, 0);
});

test('tenggat tepat hari ini: critical jika belum lengkap', () => {
  const a = D.buildAlerts([mk({ deliveryDate: T })], T);
  assert.equal(a[0].level, 'critical');
  assert.equal(a[0].rule, 'DUE_TODAY');
});

test('H-5, H-2 dibedakan; H-6 tidak ada peringatan', () => {
  assert.equal(D.buildAlerts([mk({ deliveryDate: '2026-10-21' })], T)[0].rule, 'H5');
  assert.equal(D.buildAlerts([mk({ deliveryDate: '2026-10-18' })], T)[0].rule, 'H2');
  assert.equal(D.buildAlerts([mk({ deliveryDate: '2026-10-22' })], T).length, 0);
});

test('aturan peringatan dapat dikonfigurasi', () => {
  const o = mk({ deliveryDate: '2026-10-23' });
  assert.equal(D.buildAlerts([o], T).length, 0);
  assert.equal(D.buildAlerts([o], T, { warnDays: 7, highRiskDays: 2 })[0].rule, 'H5');
});

test('peringatan memuat nomor order, PIC, tenggat, rekomendasi', () => {
  const a = D.buildAlerts([mk({ deliveryDate: '2026-10-10', pic: 'Budi' })], T)[0];
  assert.equal(a.orderId, 'VER-001'); assert.equal(a.pic, 'Budi');
  assert.equal(a.dueDate, '2026-10-10'); assert.ok(a.action.length > 5);
});

test('peringatan diurutkan critical → warning → info', () => {
  const list = D.buildAlerts([mk({ id: 'B', deliveryDate: '2026-10-21' }), mk({ id: 'A', deliveryDate: '2026-10-01' })], T);
  assert.deepEqual(list.map(x => x.level), ['critical', 'warning']);
});

test('approval ditolak jika checklist belum lengkap / belum terkirim', () => {
  assert.equal(D.canApprove(mk()).ok, false);
  const o = mk(); o.items = done(o.items);
  assert.equal(D.canApprove(o).ok, false);
  assert.equal(D.canApprove({ ...o, sent: true }).ok, true);
  assert.equal(D.canApprove({ ...o, sent: true, cancelled: true }).ok, false);
});

test('tandai kirim hanya jika checklist lengkap', () => {
  assert.equal(D.canMarkSent(mk()).ok, false);
  const o = mk(); o.items = done(o.items);
  assert.equal(D.canMarkSent(o).ok, true);
  assert.equal(D.canMarkSent({ ...o, sent: true }).ok, false);
});

test('migrasi data lama approved:true → approval.approved, idempoten', () => {
  const m = D.migrateOrder({ id: 'X', po: 'P', approved: true, sent: true, items: [{ name: 'a', qty: 1, checked: true }] });
  assert.equal(m.approval.state, 'approved');
  assert.deepEqual(D.migrateOrder(m), m);
});

test('KPI: tiap order tepat satu status; persentase benar', () => {
  const a = mk({ id: 'A', deliveryDate: '2026-10-01' });
  const b = mk({ id: 'B' });
  const c = mk({ id: 'C', sent: true, approval: { state: 'approved' } }); c.items = done(c.items);
  const k = D.computeKpis([a, b, c], T);
  assert.equal(k.overdue, 1); assert.equal(k.new, 1); assert.equal(k.done, 1);
  assert.equal(k.active, 2); assert.equal(k.completionPct, 33);
  assert.equal(k.overdue + k.new + k.processing + k.ready + k.pendingApproval + k.done, 3);
});

test('KPI kosong tidak membagi nol', () => {
  assert.equal(D.computeKpis([], T).completionPct, 0);
});

test('filter: tanggal, status, PIC, risiko, pencarian', () => {
  const a = mk({ id: 'A', pic: 'Budi', deliveryDate: '2026-10-01' });
  const b = mk({ id: 'B', pic: 'Sari', deliveryDate: '2026-10-18', po: 'PO-77' });
  const all = [a, b];
  assert.equal(D.filterOrders(all, { pic: 'Budi' }, T).length, 1);
  assert.equal(D.filterOrders(all, { status: D.STATUS.OVERDUE }, T)[0].id, 'A');
  assert.equal(D.filterOrders(all, { risk: D.RISK.HIGH }, T)[0].id, 'B');
  assert.equal(D.filterOrders(all, { from: '2026-10-10' }, T)[0].id, 'B');
  assert.equal(D.filterOrders(all, { query: 'po-77' }, T)[0].id, 'B');
  assert.equal(D.filterOrders(all, {}, T).length, 2);
});

test('validasi order eceran: tanggal terbalik, nama kosong, qty tidak valid', () => {
  const ok = { kind: 'eceran', orderDate: '2026-10-01', deliveryDate: '2026-10-02', items: [{ name: 'Kampas', qty: 1 }] };
  assert.deepEqual(D.validateOrder(ok), []);
  assert.ok(D.validateOrder({ ...ok, deliveryDate: '2026-09-30' }).length);
  assert.ok(D.validateOrder({ ...ok, items: [{ name: '  ', qty: 1 }] }).length);
  assert.ok(D.validateOrder({ ...ok, items: [{ name: 'A', qty: 0 }] }).length);
  assert.ok(D.validateOrder({ ...ok, items: [{ name: 'A', qty: 1.5 }] }).length);
  assert.ok(D.validateOrder({ ...ok, items: [] }).length);
  assert.ok(D.validateOrder({ ...ok, kind: 'lain' }).length);
});

test('validasi order set: model dan jumlah set wajib valid', () => {
  const ok = { kind: 'set', model: 'MEDIUM JB5', setQty: 2, orderDate: '2026-10-01', deliveryDate: '2026-10-15', items: [{ name: 'A', qty: 1 }] };
  assert.deepEqual(D.validateOrder(ok), []);
  assert.ok(D.validateOrder({ ...ok, model: 'X' }).length);
  assert.ok(D.validateOrder({ ...ok, setQty: 0 }).length);
});

test('tanggal otomatis: order hari ini, mulai H+1, kirim H+14 (lintas bulan/tahun)', () => {
  assert.deepEqual(D.defaultOrderDates('2026-10-17'), { orderDate: '2026-10-17', workStartDate: '2026-10-18', deliveryDate: '2026-10-31' });
  assert.equal(D.defaultOrderDates('2026-12-25').deliveryDate, '2027-01-08');
  assert.equal(D.defaultOrderDates('2028-02-20').deliveryDate, '2028-03-05');
  assert.equal(D.defaultOrderDates('2026-12-31').workStartDate, '2027-01-01');
});

test('migrasi: order lama mendapat kind eceran dan tanggal mulai pengerjaan', () => {
  const m = D.migrateOrder({ id: 'X', orderDate: '2026-10-01', items: [] });
  assert.equal(m.kind, 'eceran'); assert.equal(m.workStartDate, '2026-10-02');
});

test('validateStored: sent/approved harus konsisten dengan checklist', () => {
  assert.ok(D.validateStored({ sent: true, items: [{ checked: false }] }).length);
  assert.ok(D.validateStored({ approval: { state: 'approved' }, sent: false, items: [{ checked: true }] }).length);
  assert.deepEqual(D.validateStored({ approval: { state: 'approved' }, sent: true, items: [{ checked: true }] }), []);
  assert.ok(D.validateStored({ approval: { state: 'hack' }, items: [] }).length);
});

test('label jenis order', () => {
  assert.equal(D.orderKindLabel({ kind: 'eceran' }), 'Eceran');
  assert.equal(D.orderKindLabel({ kind: 'set', model: 'BIGBUS JB5', setQty: 3 }), 'Set BIGBUS JB5 ×3');
});

test('nextOrderId tidak bentrok setelah ada order terhapus', () => {
  assert.equal(D.nextOrderId([{ id: 'VER-001' }, { id: 'VER-007' }]), 'VER-008');
  assert.equal(D.nextOrderId([]), 'VER-001');
});

test('CSV: escape kutip dan blokir formula injection', () => {
  const csv = D.toCSV([['a"b', '=SUM(A1)', 'ok']]);
  assert.ok(csv.startsWith('\uFEFF'));
  assert.ok(csv.includes('"a""b"'));
  assert.ok(csv.includes('"\'=SUM(A1)"'));
});

test('riwayat perubahan bersifat append-only', () => {
  const o = mk(); const o2 = D.addHistory(o, 'Dibuat', 'Admin', new Date('2026-10-16T00:00:00Z'));
  assert.equal(o.history.length, 0); assert.equal(o2.history.length, 1);
});

const ready = () => { const o = mk({ sent: true }); o.items = done(o.items); return o; };

test('approval: alur lengkap draft→submitted→review→approved dengan riwayat', () => {
  let o = ready();
  for (const a of ['submit', 'review', 'approve']) {
    const r = D.approvalTransition(o, a, { by: 'Sari' }); assert.ok(r.ok, a); o = r.order;
  }
  assert.equal(o.approval.state, 'approved'); assert.equal(o.approval.by, 'Sari');
  assert.equal(o.approved, true); assert.equal(o.history.length, 3);
});

test('approval: tidak bisa lompat langkah atau tanpa checklist lengkap', () => {
  assert.equal(D.approvalTransition(ready(), 'approve').ok, false);
  assert.equal(D.approvalTransition(mk(), 'submit').ok, false);
  assert.equal(D.approvalTransition(ready(), 'hack').ok, false);
});

test('approval ditolak/revisi wajib catatan; bisa diajukan ulang', () => {
  let o = D.approvalTransition(D.approvalTransition(ready(), 'submit').order, 'review').order;
  assert.equal(D.approvalTransition(o, 'reject', { note: '  ' }).ok, false);
  o = D.approvalTransition(o, 'reject', { note: 'Foto kurang' }).order;
  assert.equal(o.approval.state, 'rejected');
  assert.equal(D.approvalTransition(o, 'submit').ok, true);
  assert.equal(D.buildAlerts([o], T).some(a => a.rule === 'REVISION'), true);
});

test('pembatalan: butuh alasan, tidak bisa untuk order approved', () => {
  assert.equal(D.cancelOrder(mk(), '').ok, false);
  const r = D.cancelOrder(mk(), 'PO dibatalkan pelanggan');
  assert.ok(r.ok); assert.equal(D.orderStatus(r.order, T), D.STATUS.CANCELLED);
  assert.equal(D.cancelOrder(mk({ approval: { state: 'approved' } }), 'x').ok, false);
});

test('tanggal order kosong/tidak valid tidak membuat error, hasilnya kosong', () => {
  assert.deepEqual(D.defaultOrderDates(''), { orderDate: '', workStartDate: '', deliveryDate: '' });
  assert.equal(D.addDays('abc', 3), '');
  assert.equal(D.defaultOrderDates('2026-11-05').deliveryDate, '2026-11-19'); // tanggal order mundur/maju sesuai input
});
