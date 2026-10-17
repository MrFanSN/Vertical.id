// Master produk interior bus (data existing, tidak diubah)
export const productCatalog = [
  {model:'BIGBUS JB5', no:1, name:'DUM DEPAN ABS + BOX TV', unit:'SET'},
  {model:'BIGBUS JB5', no:2, name:'DEK PINTU DEPAN, BLK, DARURAT', unit:'PC'},
  {model:'BIGBUS JB5', no:3, name:'COVER T KN KR + LASER CUTING', unit:'PC'},
  {model:'BIGBUS JB5', no:4, name:'COVER KABEL', unit:'PC'},
  {model:'BIGBUS JB5', no:5, name:'COVER BANDO DALAM', unit:'SET'},
  {model:'BIGBUS JB5', no:6, name:'COVER PIPA AC BLK POJOK KN KR', unit:'PC'},
  {model:'BIGBUS JB5', no:7, name:'COVER PILAR KACA BLK SAMPING KN KR', unit:'PC'},
  {model:'BIGBUS JB5', no:8, name:'DUM BELAKANG FULL', unit:'SET'},
  {model:'BIGBUS JB5', no:9, name:'COVER CAGAK DARURAT KN KR', unit:'PC'},
  {model:'BIGBUS JB5', no:10, name:'VARIASI SAMPING GEPREK + VARIASI RUMAH LAMPU SLENDANG DPN BLK, EMBLEM', unit:'SET'},
  {model:'BIGBUS JB5', no:11, name:'PLAFON JB5', unit:'PC'},
  {model:'BIGBUS JB5', no:12, name:'INNER C', unit:'PC'},
  {model:'BIGBUS JB5', no:13, name:'BOX TV TENGAH', unit:'PC'},
  {model:'BIGBUS JB5', no:14, name:'COOLBOX LENGKAP HANDLE, SKOK, ENGSEL', unit:'PC'},
  {model:'BIGBUS JB5', no:15, name:'PILAR INTEGRAL PU L PANJANG', unit:'PC'},
  {model:'BIGBUS JB5', no:16, name:'PILAR INTEGRAL PU U PENDEK', unit:'PC'},
  {model:'BIGBUS JB5', no:17, name:'COVER TUTUP PIPA DUKTING PU 3 MACAM', unit:'PC'},
  {model:'BIGBUS JB5', no:18, name:'TATAKAN RAK DUKTING ATAS BAWAH', unit:'PC'},
  {model:'BIGBUS JB5', no:19, name:'FRAME KACA BLK', unit:'PC'},
  {model:'BIGBUS JB5', no:20, name:'DEK BEGASI BELAKANG', unit:'PC'},
  {model:'BIGBUS JB5', no:21, name:'CROME BANDO, CROME PISTOL, KACA BLK', unit:'SET'},
  {model:'MEDIUM JB5', no:1, name:'DUM DEPAN ABS MEDIUM JB5 + BOX TV', unit:'SET'},
  {model:'MEDIUM JB5', no:2, name:'DEK PINTU DEPAN, BLK, DARURAT', unit:'PC'},
  {model:'MEDIUM JB5', no:3, name:'COVER T KN KR + LASER CUTTING', unit:'PC'},
  {model:'MEDIUM JB5', no:4, name:'COVER KABEL', unit:'SET'},
  {model:'MEDIUM JB5', no:5, name:'COVER BANDO DALAM', unit:'SET'},
  {model:'MEDIUM JB5', no:6, name:'COVER POJOK BLK KN KR', unit:'PC'},
  {model:'MEDIUM JB5', no:7, name:'COVER PILAR KACA BLK SAMPING KN KR', unit:'PC'},
  {model:'MEDIUM JB5', no:8, name:'DUM BELAKANG', unit:'SET'},
  {model:'MEDIUM JB5', no:9, name:'COVER CAGAK DARURAT KN KR', unit:'PC'},
  {model:'MEDIUM JB5', no:10, name:'VARIASI SAMPING GEPREK + VARIASI RUMAH LAMPU SLENDANG DPN BLK, EMBLEM', unit:'SET'},
  {model:'MEDIUM JB5', no:11, name:'PLAFON JB5 MEDIUM', unit:'PC'},
  {model:'MEDIUM JB5', no:12, name:'INNER C', unit:'PC'},
  {model:'MEDIUM JB5', no:13, name:'PILAR INTEGRAL L PANJANG', unit:'PC'},
  {model:'MEDIUM JB5', no:14, name:'PILAR INTEGRAL U PENDEK', unit:'PC'},
  {model:'MEDIUM JB5', no:15, name:'INTEGRAL COVER PIPA RAK DUKTING 3 MACAM', unit:'PC'},
  {model:'MEDIUM JB5', no:16, name:'TATAKAN RAK DUKTING ATAS BAWAH', unit:'PC'},
  {model:'MEDIUM JB5', no:17, name:'FRAME KACA BLK', unit:'PC'},
  {model:'MEDIUM JB5', no:18, name:'COOLBOX LENGKAP ENGSEL, SKOK, HANDLE', unit:'PC'},
  {model:'MEDIUM JB5', no:19, name:'CROME BANDO, CROME PISTOL, KACA BLK', unit:'PC'},
  {model:'MEDIUM JB5', no:20, name:'PARTISI MEDIUM', unit:'PC'}
];

// Jumlah per 1 set untuk produk tertentu (default 1). Satu set = 3 partisi.
export const SET_QTY_PER_SET = { 'MEDIUM JB5|PARTISI MEDIUM': 3 };

/** Susun item order untuk mode "Set": semua produk model terpilih × jumlah set. */
export function buildSetItems(model, setQty) {
  const n = Number.isInteger(setQty) && setQty > 0 ? setQty : 1;
  return productCatalog.filter(p => p.model === model).map(p => ({
    name: p.name, part: '', unit: p.unit, qty: (SET_QTY_PER_SET[`${model}|${p.name}`] || 1) * n,
  }));
}
