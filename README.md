# Vertical.id V1

Operational control system for bus sparepart orders and deliveries.

## Included
- Dashboard operational control
- Order creation
- H-3 delivery warning
- Manual checklist per product
- Automatic delivery progress
- Approval locked until all items are checked
- Shipment status
- Surat Jalan print/PDF-ready view
- Reports with daily/weekly/monthly/yearly selector
- CSV export compatible with Excel
- Browser localStorage for V1 demo/prototype

## Run locally
```bash
npm install
npm run dev
```
Open http://localhost:3000

## Deploy to Vercel
Push this folder to GitHub, import the repository in Vercel, and deploy. No environment variables are required for V1.

## Important V1 limitation
Data is stored in each browser's localStorage. It is NOT shared between users/devices. For production, replace localStorage with PostgreSQL/Supabase/Neon and add authentication/roles.


### Master Produk V1
Seed master produk telah diisi dari daftar produk interior Bigbus JB5 (21 item) dan Medium JB5 (20 item) yang diberikan user. Form order menyediakan dropdown produk berdasarkan model bus dan unit SET/PC. Harga belum diisi karena gambar yang diberikan tidak menampilkan nominal harga.
