// scripts/remap-egitmenler-from-title.mjs
// ─────────────────────────────────────────────────────────────────────────
// Mevcut aktif video'lar için başlık + açıklama'nın ilk kısmından eğitmen
// isimlerini yeniden bul. Mevcut atama eksikse veya çelişkiliyse düzelt.
//
// Mantık:
//   - Tüm bilinen eğitmen adlarını (>=3 harf) token'lara ayır
//   - Video başlığı + açıklamanın ilk 300 karakterini normalize edip token'la
//   - Bir eğitmenin tüm token'ları metinde varsa eşleşme sayılır
//   - Mevcut atama ile karşılaştır:
//       a) Title'da eşleşme yok → mevcut korunur
//       b) Title'da bulunan == mevcut → değişiklik yok
//       c) Title'da bulunan != mevcut → DÜZELT (title öncelikli)
//
// Çalıştırma:
//   node remap-egitmenler-from-title.mjs --dry-run    # rapor
//   node remap-egitmenler-from-title.mjs              # uygula
// ─────────────────────────────────────────────────────────────────────────

import 'dotenv/config';
import admin from 'firebase-admin';

const DRY_RUN = process.argv.includes('--dry-run');

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  }),
});
const db = admin.firestore();

// ─── Türkçe normalize ────────────────────────────────────────────────────
const TR_LOWER = { 'Ç': 'c', 'Ğ': 'g', 'İ': 'i', 'I': 'i', 'Ö': 'o', 'Ş': 's', 'Ü': 'u' };
function normalize(s) {
  if (!s) return '';
  let out = String(s).normalize('NFC')
    .replace(/[​-‍﻿]/g, '')
    .replace(/ /g, ' ');
  out = out.replace(/[ÇĞİIÖŞÜçğıöşü]/g, c => TR_LOWER[c.toUpperCase()] || c.toLowerCase());
  return out.toLowerCase();
}

// Tokenize: kelimeleri ayır, >=3 harf
function tokenize(s) {
  return normalize(s).split(/[^a-z0-9]+/).filter(t => t.length >= 3);
}

// Unvan strip (DataContext.jsx makeCoreId mantığı ile)
function stripUnvan(s) {
  return String(s).normalize('NFC')
    .replace(
      /^(Yrd\.?\s*Doç\.?\s*Dr\.?\s*|Prof\.?\s*Dr\.?\s*|Doç\.?\s*Dr\.?\s*|Uzm\.?\s*Dr\.?\s*|Op\.?\s*Dr\.?\s*|Dr\.?\s*Öğr\.?\s*Üyesi\.?\s*|Dr\.?\s*|Dt\.?\s*|Dyt\.?\s*|Psik\.?\s*|Psk\.?\s*|Ecz\.?\s*|Avt?\.?\s*|Öğr\.?\s*Gör\.?\s*|Arş\.?\s*Gör\.?\s*)/gi,
      ''
    ).trim();
}

async function main() {
  console.log(`[remap] başladı | DRY=${DRY_RUN}`);

  // 1. Bilinen eğitmenler: konusmacilar + kayitli_egitimler'in mevcut egitmenAdlari'ndan unique coreId map'i çıkar
  const konSnap = await db.collection('konusmacilar').get();
  const knownMap = new Map(); // coreId → { coreId, ad, tokens[] }
  for (const d of konSnap.docs) {
    const ad = d.data().ad;
    if (!ad) continue;
    const stripped = stripUnvan(ad);
    const tokens = tokenize(stripped);
    if (tokens.length < 2) continue; // tek kelimelik adlar atla (çok genel)
    const coreId = d.id;
    knownMap.set(coreId, { coreId, ad: ad.trim(), tokens });
  }

  // Mevcut atamalardan da known'a ekle
  const videoSnap = await db.collection('kayitli_egitimler').where('kayeneFiltrelendi', '==', false).get();
  for (const d of videoSnap.docs) {
    const data = d.data();
    const cids = data.egitmenler || [];
    const adlar = data.egitmenAdlari || [];
    cids.forEach((cid, i) => {
      if (!cid || knownMap.has(cid)) return;
      const ad = adlar[i];
      if (!ad) return;
      const stripped = stripUnvan(ad);
      const tokens = tokenize(stripped);
      if (tokens.length < 2) return;
      knownMap.set(cid, { coreId: cid, ad: ad.trim(), tokens });
    });
  }

  // DEDUPE: aynı token set'ine sahip eğitmenleri canonical altında topla
  // (en kısa coreId = en temiz, genelde unvansız)
  const canonical = new Map(); // tokensKey → kazanan entry
  for (const e of knownMap.values()) {
    const key = [...e.tokens].sort().join('|');
    const mevcut = canonical.get(key);
    if (!mevcut || e.coreId.length < mevcut.coreId.length) {
      canonical.set(key, e);
    }
  }
  const knownList = [...canonical.values()];
  console.log(`[known] ${knownMap.size} ham → ${knownList.length} canonical eğitmen`);

  // 2. Her video'yu kontrol et
  let batch = db.batch();
  let batchCount = 0;
  let toplamGuncel = 0;
  let toplamYeniEslesme = 0; // önceden boştu, şimdi atandı
  let toplamDuzeltme = 0;    // önceden yanlış atanmıştı, düzeltildi
  let toplamAyni = 0;        // değişiklik yok
  let toplamEslesmeyok = 0;  // title'da eşleşme bulunamadı, mevcut korundu
  const sample = { yeni: [], duzeltme: [] };

  for (const d of videoSnap.docs) {
    const data = d.data();
    const text = `${data.baslik || ''} ${(data.aciklama || '').slice(0, 300)}`;
    const textTokens = new Set(tokenize(text));

    // Title'da kim eşleşiyor?
    const matched = [];
    for (const eg of knownList) {
      const allFound = eg.tokens.every(t => textTokens.has(t));
      if (allFound) matched.push(eg);
    }

    if (matched.length === 0) {
      toplamEslesmeyok++;
      continue;
    }

    const newCoreIds = matched.map(e => e.coreId);
    const newAdlar = matched.map(e => e.ad);
    const currentCoreIds = data.egitmenler || [];

    // Aynı set mi?
    const sameSet = newCoreIds.length === currentCoreIds.length &&
      newCoreIds.every(c => currentCoreIds.includes(c));

    if (sameSet) {
      toplamAyni++;
      continue;
    }

    // Değişiklik var
    const eklenenler = newCoreIds.filter(c => !currentCoreIds.includes(c));
    const kaldirilanlar = currentCoreIds.filter(c => !newCoreIds.includes(c));

    if (currentCoreIds.length === 0) {
      toplamYeniEslesme++;
      if (sample.yeni.length < 8) {
        sample.yeni.push({ id: d.id, baslik: data.baslik, eski: 'YOK', yeni: newAdlar.join(', ') });
      }
    } else {
      toplamDuzeltme++;
      if (sample.duzeltme.length < 8) {
        sample.duzeltme.push({
          id: d.id, baslik: data.baslik,
          eski: (data.egitmenAdlari || []).join(', '),
          yeni: newAdlar.join(', '),
        });
      }
    }

    if (!DRY_RUN) {
      batch.update(d.ref, {
        egitmenler: newCoreIds,
        egitmenAdlari: newAdlar,
        eslesmemis: false,
        guncellemeTarihi: admin.firestore.FieldValue.serverTimestamp(),
      });
      batchCount++;
      if (batchCount >= 400) {
        await batch.commit();
        batch = db.batch();
        batchCount = 0;
      }
    }
    toplamGuncel++;
  }
  if (!DRY_RUN && batchCount > 0) await batch.commit();

  console.log('\n========================================');
  console.log(`✓ tamamlandı (DRY=${DRY_RUN})`);
  console.log(`  Toplam video:      ${videoSnap.size}`);
  console.log(`  Yeni eşleşme:      ${toplamYeniEslesme}  (önceden boş → şimdi atandı)`);
  console.log(`  Düzeltme:          ${toplamDuzeltme}  (yanlış atama → doğru atama)`);
  console.log(`  Değişmedi:         ${toplamAyni}  (zaten doğru)`);
  console.log(`  Title'da yok:      ${toplamEslesmeyok}  (mevcut atama korundu)`);
  console.log(`  Toplam güncellenen: ${toplamGuncel}`);
  console.log('========================================');

  if (sample.yeni.length > 0) {
    console.log('\nYeni Eşleşmeler (önceden boş, şimdi atandı):');
    for (const s of sample.yeni) {
      console.log(`  ${s.id} | ${(s.baslik || '').slice(0, 55)}`);
      console.log(`    + ${s.yeni}`);
    }
  }
  if (sample.duzeltme.length > 0) {
    console.log('\nDüzeltmeler (yanlış → doğru):');
    for (const s of sample.duzeltme) {
      console.log(`  ${s.id} | ${(s.baslik || '').slice(0, 55)}`);
      console.log(`    eski: ${s.eski}`);
      console.log(`    yeni: ${s.yeni}`);
    }
  }
}

main().catch(err => { console.error(err); process.exit(1); });
