// scripts/consolidate-egitmenler.mjs
// ─────────────────────────────────────────────────────────────────────────
// Mevcut kayitli_egitimler doc'larında egitmenler[] array'ini yeni makeCoreId
// regex'iyle yeniden hesapla. Duplicate eğitmenleri tek canonical coreId'ye
// birleştirir.
//
// Çalıştırma:
//   node consolidate-egitmenler.mjs                 # tümünü güncelle
//   node consolidate-egitmenler.mjs --dry-run       # raporla, yazma
// ─────────────────────────────────────────────────────────────────────────

import 'dotenv/config';
import admin from 'firebase-admin';

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  }),
});
const db = admin.firestore();

const TR_LOWER = { 'Ç': 'c', 'Ğ': 'g', 'İ': 'i', 'I': 'i', 'Ö': 'o', 'Ş': 's', 'Ü': 'u' };
function makeSafeId(ad) {
  if (!ad) return '';
  let s = String(ad).normalize('NFC').replace(/[​-‍﻿]/g, '').replace(/ /g, ' ').trim();
  s = s.replace(/[ÇĞİIÖŞÜçğıöşü]/g, c => TR_LOWER[c.toUpperCase()] || c.toLowerCase());
  s = s.toLowerCase();
  s = s.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return s;
}
function makeCoreId(ad) {
  if (!ad) return '';
  let clean = String(ad).normalize('NFC')
    .replace(/[​-‍﻿]/g, '')
    .replace(/ /g, ' ')
    .trim();
  if (!clean) return '';
  let s = clean.replace(
    /^(Yrd\.?\s*Doç\.?\s*Dr\.?\s*|Prof\.?\s*Dr\.?\s*|Doç\.?\s*Dr\.?\s*|Uzm\.?\s*Dr\.?\s*|Op\.?\s*Dr\.?\s*|Dr\.?\s*Öğr\.?\s*Üyesi\.?\s*|Dr\.?\s*|Dt\.?\s*|Dyt\.?\s*|Psik\.?\s*|Psk\.?\s*|Ecz\.?\s*|Avt?\.?\s*|Öğr\.?\s*Gör\.?\s*|Arş\.?\s*Gör\.?\s*)/gi,
    ''
  ).trim();
  if (s === clean) {
    s = clean.replace(
      /^(yrd_doc_dr_|prof_dr_|doc_dr_|uzm_dr_|op_dr_|dr_ogr_uyesi_|dr_|dt_|dyt_|psik_|psk_|ecz_|avt?_|ogr_gor_|ars_gor_)/i,
      ''
    ).trim();
  }
  s = s.replace(/\s+(İLE|ILE|VE|SÖYLEŞİ|SÖYLEŞI|SOYLESI|ile|ve|söyleşi)\.{0,3}\s*$/gi, '').trim();
  return s ? makeSafeId(s) : makeSafeId(clean);
}

async function main() {
  console.log(`[consolidate] başladı | DRY=${DRY_RUN}`);

  const snap = await db.collection('kayitli_egitimler').get();
  console.log(`[firestore] ${snap.size} doc bulundu.`);

  let batch = db.batch();
  let batchCount = 0;
  let updated = 0;
  let unchanged = 0;
  const sample = [];

  for (const d of snap.docs) {
    const data = d.data();
    const oldCoreIds = data.egitmenler || [];
    const adlar = data.egitmenAdlari || [];

    if (oldCoreIds.length === 0) {
      unchanged++;
      continue;
    }

    // Her ad için yeni coreId hesapla
    const newCoreIds = [];
    const seen = new Set();
    for (let i = 0; i < adlar.length; i++) {
      const ad = adlar[i];
      const newCid = makeCoreId(ad);
      if (newCid && !seen.has(newCid)) {
        seen.add(newCid);
        newCoreIds.push(newCid);
      }
    }

    // Karşılaştır
    const same = oldCoreIds.length === newCoreIds.length &&
      oldCoreIds.every((c, i) => c === newCoreIds[i]);

    if (same) {
      unchanged++;
      continue;
    }

    if (sample.length < 10) {
      sample.push({
        id: d.id,
        baslik: (data.baslik || '').slice(0, 50),
        adlar,
        eski: oldCoreIds,
        yeni: newCoreIds,
      });
    }

    if (!DRY_RUN) {
      batch.update(d.ref, {
        egitmenler: newCoreIds,
        eslesmemis: newCoreIds.length === 0,
        guncellemeTarihi: admin.firestore.FieldValue.serverTimestamp(),
      });
      batchCount++;
      if (batchCount >= 400) {
        await batch.commit();
        console.log(`[commit] ${updated + 1} doc`);
        batch = db.batch();
        batchCount = 0;
      }
    }
    updated++;
  }

  if (!DRY_RUN && batchCount > 0) {
    await batch.commit();
    console.log(`[commit] son batch: ${batchCount} doc`);
  }

  console.log('\n========================================');
  console.log(`✓ consolidate tamamlandı (DRY=${DRY_RUN})`);
  console.log(`  Güncellenen:  ${updated}`);
  console.log(`  Değişmedi:    ${unchanged}`);
  console.log('========================================');
  if (sample.length > 0) {
    console.log('\nÖrnek (ilk 10 değişen):');
    for (const s of sample) {
      console.log(`  ${s.id} | ${s.baslik}`);
      console.log(`    adlar: ${s.adlar.join(' | ')}`);
      console.log(`    eski:  ${s.eski.join(', ')}`);
      console.log(`    yeni:  ${s.yeni.join(', ')}`);
    }
  }
}

main().catch(err => {
  console.error('[consolidate] hata:', err);
  process.exit(1);
});
