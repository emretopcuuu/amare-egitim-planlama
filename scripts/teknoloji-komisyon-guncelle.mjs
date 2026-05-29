// Teknoloji komisyonu: Emre Topçu başkan, Aytuğ Gönül üye olsun
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

const ref = db.doc('komisyonlar/teknoloji');
const snap = await ref.get();
if (!snap.exists) { console.error('komisyonlar/teknoloji yok'); process.exit(1); }

const data = snap.data();
console.log('Mevcut:');
console.log('  ad:', data.ad);
console.log('  uyeler:');
(data.uyeler || []).forEach((u, i) => {
  console.log(`    ${i + 1}. ${u.ad} — ${u.rol || u.unvan || 'üye'}`);
});

// Yeni üye listesi: rolleri swap et
const yeniUyeler = (data.uyeler || []).map(u => {
  const ad = (u.ad || '').toLowerCase();
  if (ad.includes('emre') && ad.includes('topçu')) {
    return { ...u, rol: 'baskan', unvan: 'Komisyon Başkanı' };
  }
  if (ad.includes('aytuğ') || ad.includes('aytug')) {
    return { ...u, rol: 'uye', unvan: 'Komisyon Üyesi' };
  }
  return u;
});

// Sıralama: başkan en üstte
yeniUyeler.sort((a, b) => {
  const aB = (a.rol === 'baskan' || /başkan/i.test(a.unvan || '')) ? 0 : 1;
  const bB = (b.rol === 'baskan' || /başkan/i.test(b.unvan || '')) ? 0 : 1;
  return aB - bB;
});

const guncelleme = {
  ad: 'OneTeam Teknoloji Komisyonu',
  uyeler: yeniUyeler,
  guncellemeTarihi: admin.firestore.FieldValue.serverTimestamp(),
};

await ref.update(guncelleme);

console.log('\n✓ Güncellendi:');
console.log('  ad:', guncelleme.ad);
console.log('  uyeler:');
yeniUyeler.forEach((u, i) => {
  console.log(`    ${i + 1}. ${u.ad} — ${u.rol || u.unvan}`);
});
process.exit(0);
