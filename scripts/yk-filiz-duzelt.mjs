// site_icerik/yurutmekurulu içinde "Filiz Beyazıt" → "Filiz Bayazıt"
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

const ref = db.doc('site_icerik/yurutmekurulu');
const snap = await ref.get();
if (!snap.exists) {
  console.log('Firestore doc yok — sadece kod fallback kullanılıyor, kod tarafında güncel');
  process.exit(0);
}
const d = snap.data();
if (!Array.isArray(d.uyeler)) {
  console.log('uyeler array yok');
  process.exit(0);
}
let degisti = false;
const yeni = d.uyeler.map(u => {
  if (u.ad === 'Filiz Beyazıt') {
    degisti = true;
    return { ...u, ad: 'Filiz Bayazıt', coreId: 'filiz_bayazit' };
  }
  return u;
});
if (degisti) {
  await ref.update({ uyeler: yeni });
  console.log('✓ Firestore güncellendi: Filiz Beyazıt → Filiz Bayazıt');
} else {
  console.log('Listede yok, dokunmadı');
}
process.exit(0);
