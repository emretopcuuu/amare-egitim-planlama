// "EĞİTMENLER BELİRLENECEKTİR" varyantlarını tek canonical'a birleştir
// Canonical: "EĞİTMENLER BELİRLENECEKTİR" (çoğul, noktasız)
import 'dotenv/config';
import admin from 'firebase-admin';

const APPLY = process.argv.includes('--apply');

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  }),
});
const db = admin.firestore();

const CANONICAL = 'EĞİTMENLER BELİRLENECEKTİR';
const CANONICAL_CID = 'egitmenler_belirlenecektir';

console.log(`\n${APPLY ? '🚀 APPLY' : '🔍 DRY-RUN'}\n`);

// 1. Takvim entry'lerini tarayıp egitmen field'ını canonical yap
const tSnap = await db.collection('takvim').get();
const guncellenecek = [];
tSnap.forEach(d => {
  const data = d.data();
  const eg = data.egitmen || '';
  // 'BELİRLENECEK' içeren ama canonical olmayan tüm varyantlar
  if (/BEL[İI]RLENECEK/i.test(eg) && eg !== CANONICAL) {
    guncellenecek.push({ id: d.id, eskiAd: eg, tarih: data.tarih, baslik: data.egitim?.slice(0, 50) });
  }
});

console.log(`Takvim'de ${guncellenecek.length} entry güncellenecek:`);
guncellenecek.forEach((g, i) => {
  console.log(`  ${i+1}. ${g.tarih} "${g.eskiAd}" → "${CANONICAL}"`);
  console.log(`     (${g.baslik})`);
});

if (APPLY) {
  for (const g of guncellenecek) {
    await db.doc(`takvim/${g.id}`).update({ egitmen: CANONICAL });
  }
  console.log(`\n✓ ${guncellenecek.length} takvim entry güncellendi`);
}

// 2. Konuşmacılar koleksiyonunda canonical placeholder doc'unu hazırla
const cSnap = await db.collection('konusmacilar').get();
const eskiVarPaceholderlar = [];
cSnap.forEach(d => {
  const ad = d.data().ad || '';
  if (/BEL[İI]RLENECEK/i.test(ad)) {
    eskiVarPaceholderlar.push({ id: d.id, ad });
  }
});
console.log(`\nKonuşmacılar koleksiyonundaki placeholder kayıtlar: ${eskiVarPaceholderlar.length}`);
eskiVarPaceholderlar.forEach(p => console.log(`  - ${p.id}: "${p.ad}"`));

if (APPLY) {
  // Canonical doc'u set et (var ise update, yoksa oluştur)
  await db.doc(`konusmacilar/${CANONICAL_CID}`).set({
    ad: CANONICAL,
    unvan: '',
    biyografi: '',
    fotoURL: null,
    placeholder: true,
  }, { merge: true });
  console.log(`✓ Canonical doc set: konusmacilar/${CANONICAL_CID}`);

  // Diğer placeholder doc'larını sil
  for (const p of eskiVarPaceholderlar) {
    if (p.id !== CANONICAL_CID) {
      await db.doc(`konusmacilar/${p.id}`).delete();
      console.log(`✓ Sildi: konusmacilar/${p.id}`);
    }
  }
}

if (!APPLY) console.log('\n⚠️  DRY-RUN. --apply ile uygula.');
process.exit(0);
