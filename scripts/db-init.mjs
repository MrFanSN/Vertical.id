// Membuat tabel di database Turso dari db/schema.sql. Aman dijalankan berulang.
// Pemakaian: npm run db:init   (membaca TURSO_DATABASE_URL dan TURSO_AUTH_TOKEN dari .env.local)
import { readFile } from 'node:fs/promises';
import { createClient } from '@libsql/client';
import { normalizeUrl } from '../lib/server/store.js';

const url = process.env.TURSO_DATABASE_URL;
if (!url) { console.error('TURSO_DATABASE_URL belum diisi. Isi di file .env.local (lihat .env.example).'); process.exit(1); }
if (!url.startsWith('file:') && !process.env.TURSO_AUTH_TOKEN) { console.error('TURSO_AUTH_TOKEN belum diisi di .env.local.'); process.exit(1); }

const client = createClient({ url: normalizeUrl(url), authToken: process.env.TURSO_AUTH_TOKEN || undefined });
try {
  const sql = await readFile(new URL('../db/schema.sql', import.meta.url), 'utf8');
  await client.executeMultiple(sql);
  const { rows } = await client.execute("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'orders'");
  if (!rows.length) throw new Error('tabel orders tidak ditemukan setelah dijalankan');
  const host = url.startsWith('file:') ? url : new URL(normalizeUrl(url)).host;
  console.log(`OK: tabel orders siap di ${host}`);
} catch (e) {
  console.error('Gagal:', e.message);
  process.exitCode = 1;
} finally {
  client.close();
}