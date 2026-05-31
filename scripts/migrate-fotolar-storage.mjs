// scripts/migrate-fotolar-storage.mjs
// ─────────────────────────────────────────────────────────────────────────
// Base64 olarak Firestore'da saklanan konuşmacı + komisyon üye fotoları
// Firebase Storage'a yükler, doc'larda URL ile değiştirir.
//
// Çalıştırma:
//   node migrate-fotolar-storage.mjs                # dry-run (ne olacak göster)
//   node migrate-fotolar-storage.mjs --apply        # uygula
//   node migrate-fotolar-storage.mjs --apply --only=konusmacilar
//   node migrate-fotolar-storage.mjs --apply --only=komisyonlar
// ─────────────────────────────────────────────────────────────────────────

import 'dotenv/config';
import admin from 'firebase-admin';

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const only = (args.find(a => a.startsWith('--only=')) || '').replace('--only=', '');
const STORAGE_BUCKET = 'amare-egitim-planlama.firebasestorage.app';

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  }),
  storageBucket: STORAGE_BUCKET,
});
const db = admin.firestore();
const bucket = admin.storage().bucket();

// Base64 fotoURL'i Storage'a yükle, public URL döndür
async function base64ToStorage(base64, dosyaAdi) {
  // base64 prefix'ini ayır: "data:image/jpeg;base64,/9j/4AAQ..."
  const m = base64.match(/^data:(image\/[a-z+]+);base64,(.+)$/);
  if (!m) throw new Error('Geçersiz base64 formatı');
  const contentType = m[1];
  const ext = contentType.split('/')[1].replace('jpeg', 'jpg').split('+')[0];
  const buf = Buffer.from(m[2], 'base64');

  const path = `konusmaci-fotolari/${dosyaAdi}.${ext}`;
  const file = bucket.file(path);
  await file.save(buf, {
    contentType,
    metadata: { cacheControl: 'public, max-age=31536000, immutable' },
  });
  await file.makePublic();
  return `https://storage.googleapis.com/${STORAGE_BUCKET}/${path}`;
}

function isBase64(s) {
  return typeof s === 'string' && s.startsWith('data:image/');
}
function kbBuyukluk(s) {
  return Math.round((s?.length || 0) / 1024);
}

async function migrateKonusmacilar() {
  console.log('\n═══ KONUŞMACILAR ═══\n');
  const snap = await db.collection('konusmacilar').get();
  let total = 0, migrate = 0, skip = 0, hata = 0;
  let toplamKB = 0;
  const yeniUrller = {}; // { coreId: url } — komisyonlar migration'da kullanılır

  for (const doc of snap.docs) {
    total++;
    const data = doc.data();
    if (!data.fotoURL) { skip++; continue; }
    if (!isBase64(data.fotoURL)) {
      // Zaten URL — kaydet (komisyonlar için)
      if (/^https?:/.test(data.fotoURL)) yeniUrller[doc.id] = data.fotoURL;
      skip++;
      continue;
    }
    migrate++;
    const kb = kbBuyukluk(data.fotoURL);
    toplamKB += kb;
    process.stdout.write(`  ${migrate.toString().padStart(3)}. ${doc.id.padEnd(35)} ${(kb + 'KB').padStart(6)} `);

    if (!APPLY) {
      process.stdout.write('(dry-run)\n');
      continue;
    }
    try {
      const url = await base64ToStorage(data.fotoURL, doc.id);
      await doc.ref.update({ fotoURL: url, fotoMigratedAt: admin.firestore.FieldValue.serverTimestamp() });
      yeniUrller[doc.id] = url;
      process.stdout.write(`✓\n`);
    } catch (e) {
      hata++;
      process.stdout.write(`✗ ${e.message.slice(0, 50)}\n`);
    }
  }

  console.log(`\n📊 ${total} doc, ${migrate} migrate, ${skip} skip, ${hata} hata`);
  console.log(`💾 Toplam tasarruf: ${Math.round(toplamKB / 1024)} MB`);
  return yeniUrller;
}

async function migrateKomisyonlar(coreIdToUrl) {
  console.log('\n═══ KOMISYONLAR (üyeler fotoURL) ═══\n');
  const snap = await db.collection('komisyonlar').get();
  let total = 0, docUpdate = 0, uyeUpdate = 0, hata = 0;
  let toplamKB = 0;

  for (const doc of snap.docs) {
    total++;
    const data = doc.data();
    if (!Array.isArray(data.uyeler) || data.uyeler.length === 0) continue;

    let docDegisti = false;
    const yeniUyeler = [];
    for (const u of data.uyeler) {
      if (!u.fotoURL || !isBase64(u.fotoURL)) {
        yeniUyeler.push(u);
        continue;
      }
      const kb = kbBuyukluk(u.fotoURL);
      toplamKB += kb;
      process.stdout.write(`  ${doc.id.padEnd(25)} ${(u.ad || '?').padEnd(25)} ${(kb + 'KB').padStart(6)} `);

      // Önce coreId match'i dene
      const cid = u.coreId;
      let url = cid && coreIdToUrl[cid];

      if (!url) {
        // Eşleşme yok — kendi base64'ünü yükle (komisyon-özel foto)
        if (!APPLY) {
          process.stdout.write('(dry-run, kendi upload)\n');
          uyeUpdate++;
          docDegisti = true;
          yeniUyeler.push(u);
          continue;
        }
        try {
          const path = `komisyon-${doc.id}-${cid || u.ad?.replace(/\s+/g, '_')}`;
          url = await base64ToStorage(u.fotoURL, path);
        } catch (e) {
          hata++;
          process.stdout.write(`✗ ${e.message.slice(0, 50)}\n`);
          yeniUyeler.push(u);
          continue;
        }
      }

      if (!APPLY) {
        process.stdout.write('(dry-run, konusmaci URL ile)\n');
        uyeUpdate++;
        docDegisti = true;
        yeniUyeler.push({ ...u, fotoURL: url });
        continue;
      }
      yeniUyeler.push({ ...u, fotoURL: url });
      uyeUpdate++;
      docDegisti = true;
      process.stdout.write(`✓\n`);
    }

    if (docDegisti && APPLY) {
      try {
        await doc.ref.update({ uyeler: yeniUyeler });
        docUpdate++;
      } catch (e) {
        hata++;
        console.log(`  ✗ ${doc.id} update hata: ${e.message}`);
      }
    } else if (docDegisti) {
      docUpdate++; // dry-run sayısı için
    }
  }

  console.log(`\n📊 ${total} komisyon, ${docUpdate} doc güncellendi, ${uyeUpdate} üye fotosu, ${hata} hata`);
  console.log(`💾 Toplam tasarruf: ${Math.round(toplamKB / 1024)} MB`);
}

async function main() {
  console.log(`[migrate-fotolar] APPLY=${APPLY} | only=${only || 'all'}`);
  console.log(`Storage bucket: ${STORAGE_BUCKET}\n`);

  let coreIdToUrl = {};
  if (!only || only === 'konusmacilar') {
    coreIdToUrl = await migrateKonusmacilar();
  }
  if (!only || only === 'komisyonlar') {
    // konusmacilar'ı çek (eğer skip ettiysek bile referans için)
    if (only === 'komisyonlar') {
      const snap = await db.collection('konusmacilar').get();
      snap.forEach(d => {
        const data = d.data();
        if (data.fotoURL && /^https?:/.test(data.fotoURL)) coreIdToUrl[d.id] = data.fotoURL;
      });
    }
    await migrateKomisyonlar(coreIdToUrl);
  }

  if (!APPLY) {
    console.log('\n⚠️  DRY-RUN. --apply ile uygula.');
  } else {
    console.log('\n✅ Migration tamamlandı.');
    console.log('\nFrontend cache\'leri otomatik invalidate olur (TTL 7 gün).');
    console.log('Hemen tazelemek için: localStorage temizle veya browser hard refresh.');
  }
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
