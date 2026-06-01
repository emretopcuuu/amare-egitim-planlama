// Mükerrer eğitmen kayıtlarını araştır (BARBARA + ZEYNEP)
import 'dotenv/config';
import admin from 'firebase-admin';

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  }),
});
const db = admin.firestore();

// konusmacilar koleksiyonunda BARBARA + ZEYNEP içerenler
console.log('═══ KONUŞMACILAR KOLEKSİYONU ═══\n');
const kSnap = await db.collection('konusmacilar').get();
const matches = [];
kSnap.forEach(d => {
  const data = d.data();
  const ad = data.ad || '';
  if (/BAR[AB]+ARA|BARBARA/i.test(ad) || /ZEYNEP/i.test(ad)) {
    matches.push({ id: d.id, ad, fotoURL: data.fotoURL ? '✓' : '✗', unvan: data.unvan || '' });
  }
});
matches.forEach(m => {
  console.log(`  id=${m.id}`);
  console.log(`    ad="${m.ad}"`);
  console.log(`    foto: ${m.fotoURL} | unvan: "${m.unvan}"`);
});

console.log('\n═══ TAKVİM\'DE BU İSİMLER ═══\n');
const tSnap = await db.collection('takvim').get();
tSnap.forEach(d => {
  const data = d.data();
  const eg = data.egitmen || '';
  if (/BAR[AB]+ARA|BARBARA|ZEYNEP/i.test(eg)) {
    console.log(`  ${d.id}: ${data.tarih} ${data.saat || ''} — "${eg.slice(0, 80)}"`);
  }
});

process.exit(0);
