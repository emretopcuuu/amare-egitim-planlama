// Excel'i oku ve analiz et — herhangi bir değişiklik YAPMAZ
import 'dotenv/config';
import admin from 'firebase-admin';
import xlsx from 'xlsx';

const EXCEL_PATH = 'C:/Users/Emre TOPÇU/Downloads/2026 HAZİRAN TAKVİMİ.xlsx';

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  }),
});
const db = admin.firestore();

console.log('═══ EXCEL ANALİZİ ═══\n');
const wb = xlsx.readFile(EXCEL_PATH);
console.log('Sayfa adları:', wb.SheetNames);

for (const sheetName of wb.SheetNames) {
  console.log(`\n──── Sayfa: ${sheetName} ────`);
  const ws = wb.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(ws, { header: 1, defval: '' });
  console.log(`Satır sayısı: ${data.length}`);
  console.log('İlk 5 satır:');
  data.slice(0, 5).forEach((row, i) => {
    console.log(`  [${i}]:`, row.slice(0, 10));
  });
  if (data.length > 5) {
    console.log('  ...');
    console.log(`  [${data.length - 1}]:`, data[data.length - 1].slice(0, 10));
  }
}

console.log('\n═══ FİRESTORE TAKVİM YAPISI ═══\n');
// Sadece 5 örnek doc — kolonları gör
const snap = await db.collection('takvim').limit(5).get();
console.log(`Toplam: bilgi alınıyor...`);
const cnt = await db.collection('takvim').count().get();
console.log(`Toplam takvim doc: ${cnt.data().count}`);

console.log('\nÖrnek 5 doc:');
snap.docs.forEach((d, i) => {
  const data = d.data();
  console.log(`\n  [${i}] ID: ${d.id}`);
  console.log(`     Fields:`, Object.keys(data).join(', '));
  console.log(`     tarih=${data.tarih} saat=${data.saat} bitisSaati=${data.bitisSaati}`);
  console.log(`     egitim=${data.egitim?.slice?.(0, 60)}`);
  console.log(`     egitmen=${data.egitmen}`);
  console.log(`     sehir=${data.sehir} yer=${data.yer?.slice?.(0, 60)}`);
});

// Haziran 2026 ve sonrası kaç toplantı?
console.log('\n═══ MEVCUT HAZİRAN 2026+ ETKİNLİKLERİ ═══\n');
const tumSnap = await db.collection('takvim').get();
const parseTarih = (t) => {
  const m = (t || '').match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  return m ? new Date(+m[3], +m[2] - 1, +m[1]) : null;
};
const haziranBas = new Date(2026, 5, 1); // Haziran = ay 5 (0-indexed)
const haziranSon = new Date(2026, 6, 1);
const sonrasi = new Date(2026, 11, 31);
const bugun = new Date(); bugun.setHours(0, 0, 0, 0);

let haziran = [], sonraki = [], gecmis = [], hatali = 0;
tumSnap.forEach(d => {
  const data = d.data();
  const dt = parseTarih(data.tarih);
  if (!dt) { hatali++; return; }
  if (dt >= haziranBas && dt < haziranSon) haziran.push({ id: d.id, ...data, _d: dt });
  else if (dt >= haziranSon) sonraki.push({ id: d.id, ...data, _d: dt });
  else if (dt < bugun) gecmis.push({ id: d.id, ...data, _d: dt });
});
console.log(`HAZIRAN 2026: ${haziran.length} etkinlik`);
console.log(`HAZIRAN SONRASI (Tem 2026+): ${sonraki.length}`);
console.log(`Geçmiş: ${gecmis.length}`);
console.log(`Hatalı tarih: ${hatali}`);

console.log('\nHaziran 2026 ÖZET:');
haziran.sort((a, b) => a._d - b._d).slice(0, 30).forEach((e, i) => {
  console.log(`  ${i + 1}. ${e.tarih} ${e.saat || ''} - ${(e.egitim || '').slice(0, 50)} (${e.egitmen?.slice?.(0, 40) || ''})`);
});
if (haziran.length > 30) console.log(`  ... +${haziran.length - 30} daha`);

console.log('\nKonuşmacı koleksiyonu:');
const kSnap = await db.collection('konusmacilar').count().get();
console.log(`Toplam konuşmacı doc: ${kSnap.data().count}`);

process.exit(0);
