// Akses database Turso (libSQL/SQLite). Hanya dipakai di server; token tidak pernah dikirim ke browser.

const g = globalThis;

/** Dianggap terkonfigurasi jika URL ada; URL remote (libsql://, https://) wajib disertai token. */
export function isConfigured() {
  const url = process.env.TURSO_DATABASE_URL || '';
  if (!url) return false;
  return url.startsWith('file:') || !!process.env.TURSO_AUTH_TOKEN;
}

async function db() {
  if (g.__verticalDb) return g.__verticalDb;
  const { createClient } = await import('@libsql/client');
  g.__verticalDb = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN || undefined,
  });
  return g.__verticalDb;
}

/** Hanya untuk tes: pasang klien tiruan. */
export function useClient(client) { g.__verticalDb = client; }

const idOf = seq => 'VER-' + String(seq).padStart(3, '0');
/** 'VER-007' → 7. Mengembalikan null untuk format lain. */
export function seqOf(id) {
  const m = /^VER-(\d{1,9})$/.exec(String(id));
  return m ? Number(m[1]) : null;
}

const toRow = r => ({ id: idOf(Number(r.seq)), version: Number(r.version), data: JSON.parse(r.data) });
export const toOrder = r => ({ ...r.data, id: r.id, version: r.version });

export async function listOrders() {
  const { rows } = await (await db()).execute('SELECT seq, version, data FROM orders ORDER BY seq DESC LIMIT 1000');
  return rows.map(toRow);
}

export async function createOrder(data) {
  const { rows } = await (await db()).execute({
    sql: 'INSERT INTO orders (data) VALUES (?) RETURNING seq, version, data',
    args: [JSON.stringify(data)],
  });
  return toRow(rows[0]);
}

/** Update dengan optimistic locking. Mengembalikan null jika versi sudah berubah (konflik) atau id tidak ada. */
export async function updateOrder(id, version, data) {
  const seq = seqOf(id);
  if (!seq) return null;
  const { rows } = await (await db()).execute({
    sql: 'UPDATE orders SET data = ?, version = version + 1, updated_at = ? WHERE seq = ? AND version = ? RETURNING seq, version, data',
    args: [JSON.stringify(data), new Date().toISOString(), seq, Number(version)],
  });
  return rows[0] ? toRow(rows[0]) : null;
}
