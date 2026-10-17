import { guard, sanitizeOrder } from '../../../../lib/server/guard.js';
import { toOrder, updateOrder } from '../../../../lib/server/store.js';
import { validateOrder, validateStored } from '../../../../lib/domain.js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const logDb = e => console.error('[db]', e?.code || e?.name, e?.message);

export async function PATCH(req, { params }) {
  const denied = guard(req); if (denied) return denied;
  const { id } = await params; // Next.js 15+: params berupa Promise
  if (!/^VER-\d{1,9}$/.test(id)) return Response.json({ error: 'bad_id' }, { status: 400 });
  let body; try { body = await req.json(); } catch { return Response.json({ error: 'bad_json' }, { status: 400 }); }
  if (!Number.isInteger(body.version) || body.version < 1) return Response.json({ error: 'bad_version' }, { status: 400 });
  const data = sanitizeOrder(body.order);
  const errors = [...validateOrder(data), ...validateStored(data)];
  if (errors.length) return Response.json({ error: 'invalid', message: errors[0], errors }, { status: 422 });
  try {
    const row = await updateOrder(id, body.version, data);
    if (!row) return Response.json({ error: 'conflict', message: 'Data sudah diubah pengguna lain.' }, { status: 409 });
    return Response.json({ order: toOrder(row) });
  } catch (e) { logDb(e); return Response.json({ error: 'db_error', message: 'Gagal menyimpan perubahan ke server.' }, { status: 502 }); }
}
