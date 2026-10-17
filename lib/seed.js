// Data contoh untuk demo. Hanya dimuat jika pengguna menekan "Muat Data Contoh".
// Tanggal dibuat relatif terhadap hari ini agar peringatan dapat didemonstrasikan.
import { todayISO } from './domain.js';

function shift(iso, days) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export function buildDemoOrders(today = todayISO()) {
  const it = (list) => list.map(([name, qty, checked], n) => ({ id: n + 1, name, part: '', qty, unit: 'PC', checked }));
  return [
    { id: 'VER-001', pic: 'Contoh PIC', priority: 'high', orderDate: shift(today, -10), deliveryDate: shift(today, 1), notes: 'DATA CONTOH',
      items: it([['PLAFON JB5', 2, true], ['INNER C', 4, true], ['COVER KABEL', 6, false], ['FRAME KACA BLK', 2, false]]) },
    { id: 'VER-002', pic: 'Contoh PIC', priority: 'normal', orderDate: shift(today, -7), deliveryDate: shift(today, 4), notes: 'DATA CONTOH',
      items: it([['COOLBOX LENGKAP HANDLE, SKOK, ENGSEL', 1, false], ['DUM BELAKANG FULL', 1, false]]) },
    { id: 'VER-003', pic: 'PIC Lain', priority: 'normal', orderDate: shift(today, -14), deliveryDate: shift(today, -3), notes: 'DATA CONTOH — terlambat',
      items: it([['COVER BANDO DALAM', 2, true], ['TATAKAN RAK DUKTING ATAS BAWAH', 2, false]]) },
    { id: 'VER-004', pic: 'PIC Lain', priority: 'low', orderDate: shift(today, -5), deliveryDate: shift(today, 12), notes: 'DATA CONTOH',
      items: it([['PARTISI MEDIUM', 1, false]]) },
  ];
}
