import { createHash, timingSafeEqual } from 'node:crypto';
import { isConfigured } from './store.js';

const ORDER_FIELDS = ['kind', 'model', 'setQty', 'pic', 'customer', 'priority', 'orderDate', 'workStartDate', 'deliveryDate',
  'notes', 'items', 'sent', 'sentAt', 'approval', 'cancelled', 'cancelReason', 'history', 'po'];

const str = (v, max) => String(v ?? '').slice(0, max);

/** Hanya field yang dikenal yang disimpan; teks dibatasi panjangnya. */
export function sanitizeOrder(o = {}) {
  const out = {};
  for (const k of ORDER_FIELDS) if (o[k] !== undefined) out[k] = o[k];
  for (const k of ['pic', 'customer']) if (k in out) out[k] = str(out[k], 120);
  for (const k of ['notes', 'cancelReason']) if (k in out) out[k] = str(out[k], 1000);
  out.items = (Array.isArray(out.items) ? out.items : []).slice(0, 300).map((i, n) => ({
    id: Number.isInteger(i.id) ? i.id : n + 1, name: str(i.name, 200), part: str(i.part, 80), unit: str(i.unit || 'PC', 12),
    qty: Number(i.qty), checked: !!i.checked,
  }));
  out.history = (Array.isArray(out.history) ? out.history : []).slice(-200).map(h => ({ at: str(h.at, 40), by: str(h.by, 60), action: str(h.action, 300) }));
  out.sent = !!out.sent; out.cancelled = !!out.cancelled;
  if (out.approval) out.approval = { state: str(out.approval.state, 30), by: out.approval.by ? str(out.approval.by, 60) : null, at: out.approval.at ? str(out.approval.at, 40) : null, note: str(out.approval.note, 1000) };
  return out;
}

/** Perbandingan waktu-tetap agar kode tidak bisa ditebak lewat selisih waktu respons. */
function sameCode(a, b) {
  const ha = createHash('sha256').update(String(a ?? '')).digest();
  const hb = createHash('sha256').update(String(b ?? '')).digest();
  return timingSafeEqual(ha, hb);
}

/** Pemeriksaan akses. Mengembalikan Response jika ditolak, null jika boleh lanjut. */
export function guard(req) {
  if (!isConfigured()) return Response.json({ error: 'not_configured' }, { status: 503 });
  const code = process.env.ACCESS_CODE;
  if (code && !sameCode(req.headers.get('x-access-code'), code)) return Response.json({ error: 'unauthorized' }, { status: 401 });
  return null;
}
