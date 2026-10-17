# Vertical.id V1

Sistem kontrol operasional untuk order dan pengiriman sparepart bus.

## Fitur (Operational Control Center, Fase 1-3)
- **Dashboard**: 10 KPI dengan definisi eksplisit, filter (tanggal, status, pengiriman, PIC, prioritas, risiko), peringatan operasional, dan timeline pengiriman yang dapat diurutkan.
- **Peringatan berbasis aturan** (`lib/domain.js`, dapat dikonfigurasi): terlambat, hari ini, H-2, H-5, menunggu approval, revisi.
- **Satu status tunggal per order**: tidak ada order yang terlambat sekaligus selesai. Progress dihitung dari checklist aktual.
- **Approval terpisah dari progress**: Draft → Diajukan → Ditinjau → Disetujui / Ditolak / Perlu Revisi, lengkap dengan catatan dan riwayat.
- **Pembatalan order, konfirmasi pengiriman** (checklist dikunci), dan **riwayat perubahan** per order.
- **Validasi order** (tanggal, jumlah), **laporan** dengan filter periode, dan **CSV aman untuk Excel**.
- Semua perhitungan tanggal memakai zona waktu **Asia/Jakarta (WIB)**.

## Aturan order
- Nomor order dibuat otomatis (VER-001, VER-002, dst) dan tidak ada input PO.
- Tanggal order = hari ini (WIB), mulai pengerjaan = H+1, pengiriman = H+14.
- **Eceran**: produk diketik manual.
- **Set**: pilih Bigbus atau Medium, lalu semua produk model tersebut masuk otomatis. 1 set berisi 3 partisi (`SET_QTY_PER_SET` di `lib/catalog.js`).

## Master Produk
Seed master produk berisi produk interior Bigbus JB5 (21 item) dan Medium JB5 (20 item). Form order menyediakan dropdown produk berdasarkan model bus dan unit SET/PC. Harga belum diisi.

## Menjalankan secara lokal
Butuh Node.js 20.9 atau lebih baru.
```bash
npm install
npm run dev
```
Buka http://localhost:3000

Tanpa konfigurasi database, aplikasi berjalan dalam **mode lokal**: data disimpan di localStorage browser masing-masing dan tidak dibagikan antar pengguna atau perangkat.

## Penyimpanan bersama (Turso)
Agar semua pengguna melihat order yang sama:

1. Buat database di https://turso.tech, lalu buat **auth token** untuk database itu.
2. Salin `.env.example` menjadi `.env.local`, lalu isi:

   | Variabel | Keterangan |
   |---|---|
   | `TURSO_DATABASE_URL` | URL database (berawalan `libsql://`) |
   | `TURSO_AUTH_TOKEN` | Auth token (rahasia) |
   | `ACCESS_CODE` | Kode akses pengguna (**sangat disarankan**) |

3. Buat tabel (sekali saja, aman diulang):
   ```bash
   npm run db:init
   ```
   Skrip membaca `db/schema.sql` dan menjalankannya ke database Turso di `.env.local`.
4. Di Vercel: **Project → Settings → Environment Variables**, isi tiga variabel yang sama, lalu **Redeploy**. Sidebar akan menampilkan "Tersinkron ke server".

Catatan:
- Token hanya dipakai di sisi server (API route). Jangan pernah memberi prefix `NEXT_PUBLIC_`, jangan di-commit ke GitHub, dan jangan dibagikan di chat. Jika bocor, cabut dan buat yang baru di Turso.
- Jika `ACCESS_CODE` kosong, siapa pun yang punya link dapat melihat dan mengubah order. Untuk penggunaan nyata, isi kode ini.
- Untuk uji lokal tanpa internet, `TURSO_DATABASE_URL=file:./local.db` memakai file SQLite lokal (jalankan `npm run db:init` lebih dulu).
- Order lama di browser akan menawarkan tombol "Unggah ke server" (mendapat nomor order baru).
- Data disinkron tiap 20 detik. Perubahan bersamaan oleh dua orang ditolak dengan aman (kontrol versi, respons 409), bukan saling menimpa.
- Supaya respons cepat, atur region fungsi Vercel dekat database (Tokyo, `hnd1`) di **Settings → Functions**, jika database Turso ada di `ap-northeast-1`.

## Deploy ke Vercel
1. Push folder ini ke GitHub.
2. Import repository di Vercel dan deploy.
3. Untuk penyimpanan bersama, isi environment variable di atas, lalu redeploy.

## Tes
```bash
npm test
```
Tes logika bisnis dan API memakai database SQLite sungguhan di memori dengan skema `db/schema.sql`. Tes API memakai `node:sqlite` (Node 22.13+); pada Node yang lebih lama dipakai `@libsql/client` di memori.

## Belum tersedia
- Autentikasi per pengguna dan peran (saat ini hanya satu `ACCESS_CODE` bersama)
- Pembatasan percobaan kode akses yang salah (rate limit)
- Modul stok sparepart
- Lampiran dokumen
- Kesiapan material terpisah
