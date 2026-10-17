-- Skema SQLite untuk Turso. Aman dijalankan berulang (idempotent).
-- Jalankan dengan: npm run db:init
--
-- Nomor order VER-001, VER-002, ... dibentuk dari kolom seq (AUTOINCREMENT),
-- sehingga unik dan tidak pernah dipakai ulang, walau banyak pengguna menyimpan bersamaan.

CREATE TABLE IF NOT EXISTS orders (
  seq        INTEGER PRIMARY KEY AUTOINCREMENT,
  version    INTEGER NOT NULL DEFAULT 1,
  data       TEXT    NOT NULL,
  created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
