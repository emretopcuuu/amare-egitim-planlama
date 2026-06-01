// Mükerrer eğitmen kayıtlarını birleştir — BARBARA + ZEYNEP
// 1. konusmacilar/{eski} → konusmacilar/{yeni} (fotoyla)
// 2. takvim entry'lerinde egitmen alanı string replace
// 3. konusmacilar/{eski} sil
// 4. Cache temizle
//
// Kullanım:
//   node mukerrer-birlestir.mjs              # dry-run
//   node mukerrer-birlestir.mjs --apply      # uygula

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

// Birleştirilecek çiftler
const PLAN = [
  {
    eskiId: 'barabara_i_elmleitner',
    eskiAd: 'BARABARA I. ELMLEİTNER',
    yeniId: 'barbara_i_elmeitner',
    yeniAd: 'BARBARA I. ELMEİTNER',
    takvimReplaceler: [
      { from: 'BARABARA I. ELMLEİTNER', to: 'BARBARA I. ELMEİTNER' },
      { from: 'BARBARA I.ELMEİTNER', to: 'BARBARA I. ELMEİTNER' }, // Excel'deki nokta-sonrası boşluksuz versiyon
    ],
  },
  {
    eskiId: 'zeynep',
    eskiAd: 'ZEYNEP',
    yeniId: 'zeynep_demir',
    yeniAd: 'ZEYNEP DEMİR',
    takvimReplaceler: [
      // "ZEYNEP" tek başına geçen takvim kaydı yoksa, yine de kontrol et
      { from: 'ZEYNEP', to: 'ZEYNEP DEMİR', kelime: true }, // sadece tam kelime, ZEYNEP DEMİR'i bozmasın
    ],
  },
];

console.log(`\n${APPLY ? '🚀 APPLY' : '🔍 DRY-RUN'}\n`);

for (const p of PLAN) {
  console.log(`\n═══ ${p.eskiAd}  →  ${p.yeniAd} ═══`);

  // 1. Eski doc'u oku
  const eskiSnap = await db.doc(`konusmacilar/${p.eskiId}`).get();
  if (!eskiSnap.exists) {
    console.log(`  ⏭️  Eski doc yok: ${p.eskiId}`);
    continue;
  }
  const eskiData = eskiSnap.data();
  console.log(`  Eski doc: foto=${eskiData.fotoURL ? 'VAR' : 'YOK'}, unvan="${eskiData.unvan || ''}"`);

  // 2. Yeni doc var mı?
  const yeniSnap = await db.doc(`konusmacilar/${p.yeniId}`).get();
  if (yeniSnap.exists) {
    const yeniData = yeniSnap.data();
    console.log(`  Yeni doc ZATEN VAR: foto=${yeniData.fotoURL ? 'VAR' : 'YOK'}, unvan="${yeniData.unvan || ''}"`);
    // Yeni doc'a eksik alanları MERGE et (eski fotosu varsa, yeni'de yoksa)
    const guncelle = {};
    if (!yeniData.fotoURL && eskiData.fotoURL) guncelle.fotoURL = eskiData.fotoURL;
    if (!yeniData.unvan && eskiData.unvan) guncelle.unvan = eskiData.unvan;
    if (!yeniData.biyografi && eskiData.biyografi) guncelle.biyografi = eskiData.biyografi;
    guncelle.ad = p.yeniAd;
    if (APPLY && Object.keys(guncelle).length > 0) {
      await db.doc(`konusmacilar/${p.yeniId}`).update(guncelle);
      console.log(`  ✓ Yeni doc güncellendi (merge):`, Object.keys(guncelle).join(', '));
    } else if (Object.keys(guncelle).length > 0) {
      console.log(`  → Yeni doc güncelleneecek (merge):`, Object.keys(guncelle).join(', '));
    } else {
      console.log(`  ⏭️  Yeni doc zaten tam`);
    }
  } else {
    // Yeni doc yok — eskinin verisiyle oluştur
    const yeniData = {
      ...eskiData,
      ad: p.yeniAd,
      eskiId: p.eskiId, // izleme için
      birlestirilmeTarihi: admin.firestore.FieldValue.serverTimestamp(),
    };
    if (APPLY) {
      await db.doc(`konusmacilar/${p.yeniId}`).set(yeniData);
      console.log(`  ✓ Yeni doc oluşturuldu: ${p.yeniId}`);
    } else {
      console.log(`  → Yeni doc oluşturulacak: ${p.yeniId}`);
    }
  }

  // 3. Takvim'de string replace
  const tSnap = await db.collection('takvim').get();
  let degisen = 0;
  for (const d of tSnap.docs) {
    const data = d.data();
    let eg = data.egitmen || '';
    let degisti = false;
    for (const r of p.takvimReplaceler) {
      if (r.kelime) {
        // Tam kelime match (sınırlarına bakar)
        const re = new RegExp(`\\b${r.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
        // ZEYNEP varsa ama ZEYNEP DEMİR DEĞİLse değiştir
        const eski = eg;
        eg = eg.replace(re, r.to);
        // Eğer "ZEYNEP DEMİR DEMİR" gibi double oldu, geri al
        eg = eg.replace(new RegExp(`${r.to} DEMİR`, 'g'), r.to);
        if (eg !== eski) degisti = true;
      } else {
        if (eg.includes(r.from)) {
          eg = eg.split(r.from).join(r.to);
          degisti = true;
        }
      }
    }
    if (degisti) {
      degisen++;
      console.log(`  Takvim ${d.id}: "${data.egitmen.slice(0, 60)}" → "${eg.slice(0, 60)}"`);
      if (APPLY) await d.ref.update({ egitmen: eg });
    }
  }
  console.log(`  → ${degisen} takvim doc güncellendi`);

  // 4. Eski doc'u sil (eski ≠ yeni ise)
  if (p.eskiId !== p.yeniId) {
    if (APPLY) {
      await db.doc(`konusmacilar/${p.eskiId}`).delete();
      console.log(`  ✓ Eski doc silindi: ${p.eskiId}`);
    } else {
      console.log(`  → Eski doc silinecek: ${p.eskiId}`);
    }
  }
}

if (!APPLY) {
  console.log('\n⚠️  DRY-RUN. --apply ile uygula.');
} else {
  console.log('\n✅ Birleştirme tamamlandı. Sayfayı yenile.');
}
process.exit(0);
