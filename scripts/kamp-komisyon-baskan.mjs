// Kamp Komisyonu başkanı = Aytuğ Gönül
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

// Aytuğ'un foto'sunu Teknoloji komisyonundan veya konusmacilar'dan al
let aytugFoto = null;
let aytugEmail = null;
const teknoloji = await db.doc('komisyonlar/teknoloji').get();
if (teknoloji.exists) {
  const ay = (teknoloji.data().uyeler || []).find(u => /aytuğ|aytug/i.test(u.ad));
  if (ay) {
    aytugFoto = ay.fotoURL || null;
    aytugEmail = ay.email || null;
    console.log('✓ Aytuğ foto + email Teknoloji\'den alındı');
  }
}

const ref = db.doc('komisyonlar/kamp');
const snap = await ref.get();
if (!snap.exists) { console.error('komisyonlar/kamp yok'); process.exit(1); }

const data = snap.data();
console.log('\nMevcut üyeler:');
(data.uyeler || []).forEach((u, i) => console.log(`  ${i + 1}. ${u.ad} — ${u.rol || u.unvan || '?'}`));

// "Seçim Aşamasında" placeholder'ı kaldır, Aytuğ'u başkan olarak ekle
const yeniUyeler = (data.uyeler || []).filter(u => !/seçim aşamasında|secim asamasinda/i.test(u.ad || ''));

yeniUyeler.unshift({
  coreId: 'aytug_gonul',
  ad: 'Aytuğ Gönül',
  rol: 'baskan',
  unvan: 'Komisyon Başkanı',
  ...(aytugFoto ? { fotoURL: aytugFoto } : {}),
  ...(aytugEmail ? { email: aytugEmail } : {}),
});

await ref.update({
  uyeler: yeniUyeler,
  guncellemeTarihi: admin.firestore.FieldValue.serverTimestamp(),
});

console.log('\n✓ Güncellendi:');
yeniUyeler.forEach((u, i) => console.log(`  ${i + 1}. ${u.ad} — ${u.unvan}`));
process.exit(0);
