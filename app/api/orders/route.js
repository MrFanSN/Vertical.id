import { guard, sanitizeOrder } from '../../../lib/server/guard.js';
import { createOrder, listOrders, toOrder } from '../../../lib/server/store.js';
import { validateOrder, validateStored } from '../../../lib/domain.js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const logDb = e => console.error('[db]', e?.code || e?.name, e?.message);

export async function GET(req) {
  const denied = guard(req); if (denied) return denied;
  try { return Response.json({ orders: (await listOrders()).map(toOrder) }); }
  catch (e) { logDb(e); return Response.json({ error: 'db_error', message: 'Gagal membaca data dari server.' }, { status: 502 }); }
}

export async function POST(req) {
  const denied = guard(req); if (denied) return denied;
  let body; try { body = await req.json(); } catch { return Response.json({ error: 'bad_json' }, { status: 400 }); }
  const data = sanitizeOrder(body.order);
  const errors = [...validateOrder(data), ...validateStored(data)];
  if (errors.length) return Response.json({ error: 'invalid', message: errors[0], errors }, { status: 422 });
  try { return Response.json({ order: toOrder(await createOrder(data)) }, { status: 201 }); }
  catch (e) { logDb(e); return Response.json({ error: 'db_error', message: 'Gagal menyimpan order ke server.' }, { status: 502 }); }
}
