// scripts/fix-embed-urls.mjs
// ─────────────────────────────────────────────────────────────────────────
// Vimeo unlisted video'lar embed URL'inde 'h' hash parametresi gerektirir.
// Eski ingest sadece /video/{id} kaydetti, hash'siz iframe "Sorry" diyor.
// Bu script: Vimeo API'den her video'nun gerçek player_embed_url'ini çek,
// Firestore'daki embedUrl alanını güncelle.
//
// İdempotent: tekrar çalıştırılırsa aynı URL'leri yazar.
// Çalıştırma:
//   node fix-embed-urls.mjs              # full update
//   node fix-embed-urls.mjs --dry-run    # sadece sample göster
//   node fix-embed-urls.mjs --limit=50
// ─────────────────────────────────────────────────────────────────────────

import 'dotenv/config';
import admin from 'firebase-admin';

const args = process.argv.slice(2);
const flag = (n) => args.includes(`--${n}`);
const param = (n, d) => {
  const a = args.find(a => a.startsWith(`--${n}=`));
  return a ? a.split('=')[1] : d;
};
const DRY_RUN = flag('dry-run');
const LIMIT = parseInt(param('limit', '0'), 10) || Infinity;

const VIMEO_TOKEN = process.env.VIMEO_TOKEN;

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  }),
});
const db = admin.firestore();

async function vimeoFetchAllEmbedUrls() {
  const map = new Map(); // vimeoId → player_embed_url
  let url = '/me/videos?per_page=100&page=1&fields=uri,player_embed_url';
  let page = 0;
  while (url) {
    page++;
    process.stdout.write(`\r[vimeo] sayfa ${page}...`);
    const res = await fetch('https://api.vimeo.com' + url, {
      headers: {
        'Authorization': 'bearer ' + VIMEO_TOKEN,
        'Accept': 'application/vnd.vimeo.*+json;version=3.4',
      },
    });
    if (!res.ok) {
      console.error(`\n[vimeo] HATA sayfa ${page}: ${res.status}`);
      break;
    }
    const data = await res.json();
    for (const v of (data.data || [])) {
      const id = String(v.uri || '').split('/').pop();
      if (id && v.player_embed_url) map.set(id, v.player_embed_url);
    }
    url = data.paging?.next || null;
  }
  console.log(`\n[vimeo] ${map.size} embed URL alındı.`);
  return map;
}

async function main() {
  console.log(`[fix-embed] başladı | DRY=${DRY_RUN} | LIMIT=${LIMIT}`);

  const embedMap = await vimeoFetchAllEmbedUrls();

  // Firestore'daki tüm kayitli_egitimler'i çek (sadece embedUrl alanı yeterli)
  const snap = await db.collection('kayitli_egitimler').get();
  console.log(`[firestore] ${snap.size} doc bulundu.`);

  let batch = db.batch();
  let batchCount = 0;
  let updated = 0;
  let skipped = 0;
  let noVimeo = 0;
  const sample = [];

  for (const d of snap.docs) {
    if (updated >= LIMIT) break;
    const data = d.data();
    const vimeoId = data.vimeoId || d.id;
    const newUrl = embedMap.get(vimeoId);

    if (!newUrl) {
      noVimeo++;
      continue;
    }
    if (data.embedUrl === newUrl) {
      skipped++;
      continue;
    }

    if (DRY_RUN) {
      if (sample.length < 5) {
        sample.push({
          vimeoId,
          baslik: (data.baslik || '').slice(0, 60),
          old: data.embedUrl,
          new: newUrl,
        });
      }
    } else {
      batch.update(d.ref, {
        embedUrl: newUrl,
        guncellemeTarihi: admin.firestore.FieldValue.serverTimestamp(),
      });
      batchCount++;
      if (batchCount >= 400) {
        await batch.commit();
        console.log(`[commit] ${updated + 1} doc güncellendi`);
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
  console.log(`✓ fix-embed tamamlandı (DRY=${DRY_RUN})`);
  console.log(`  Güncellenen:        ${updated}`);
  console.log(`  Zaten doğru:        ${skipped}`);
  console.log(`  Vimeo'da yok:       ${noVimeo}`);
  console.log('========================================');
  if (DRY_RUN && sample.length > 0) {
    console.log('\nÖrnek (ilk 5):');
    for (const s of sample) {
      console.log(`  ${s.vimeoId} | ${s.baslik}`);
      console.log(`    eski: ${s.old}`);
      console.log(`    yeni: ${s.new}`);
    }
  }
}

main().catch(err => {
  console.error('[fix-embed] hata:', err);
  process.exit(1);
});
