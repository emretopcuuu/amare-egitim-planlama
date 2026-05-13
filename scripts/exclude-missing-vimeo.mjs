// scripts/exclude-missing-vimeo.mjs
// ─────────────────────────────────────────────────────────────────────────
// Vimeo'da artık olmayan veya oynatılamayan video'ları otomatik dışla.
// Vimeo /me/videos listesindeki id'lerle Firestore'daki id'leri karşılaştırır.
// Eksik olanları kayeneFiltrelendi=true yapar.
//
// Çalıştırma:
//   node exclude-missing-vimeo.mjs              # uygula
//   node exclude-missing-vimeo.mjs --dry-run    # raporla
// ─────────────────────────────────────────────────────────────────────────

import 'dotenv/config';
import admin from 'firebase-admin';

const DRY_RUN = process.argv.includes('--dry-run');
const VIMEO_TOKEN = process.env.VIMEO_TOKEN;

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  }),
});
const db = admin.firestore();

async function vimeoFetch(p) {
  const res = await fetch('https://api.vimeo.com' + p, {
    headers: { 'Authorization': 'bearer ' + VIMEO_TOKEN, 'Accept': 'application/vnd.vimeo.*+json;version=3.4' },
  });
  if (!res.ok) throw new Error(`Vimeo ${res.status}`);
  return res.json();
}

async function fetchAllVimeoIds() {
  // Hem id hem is_playable + status alalım
  const map = new Map(); // id → { playable, status }
  let url = '/me/videos?per_page=100&page=1&fields=uri,is_playable,status,name';
  let page = 0;
  while (url) {
    page++;
    process.stdout.write(`\r[vimeo] sayfa ${page}...`);
    const data = await vimeoFetch(url);
    for (const v of (data.data || [])) {
      const id = String(v.uri || '').split('/').pop();
      if (id) map.set(id, { playable: v.is_playable, status: v.status, name: v.name });
    }
    url = data.paging?.next || null;
  }
  console.log(`\n[vimeo] ${map.size} video listede`);
  return map;
}

async function main() {
  console.log(`[exclude-missing] başladı | DRY=${DRY_RUN}`);

  const vimeoMap = await fetchAllVimeoIds();
  const snap = await db.collection('kayitli_egitimler').where('kayeneFiltrelendi', '==', false).get();
  console.log(`[firestore] ${snap.size} aktif doc`);

  let batch = db.batch();
  let batchCount = 0;
  let missingCount = 0;
  let unplayableCount = 0;
  const sample = [];

  for (const d of snap.docs) {
    const data = d.data();
    const vid = data.vimeoId || d.id;
    const meta = vimeoMap.get(vid);

    let reason = null;
    if (!meta) {
      reason = 'Vimeo\'da yok (silindi)';
      missingCount++;
    } else if (meta.status && meta.status !== 'available') {
      reason = `Vimeo status: ${meta.status}`;
      unplayableCount++;
    } else if (meta.playable === false) {
      reason = 'Vimeo: oynatılamıyor';
      unplayableCount++;
    }

    if (reason) {
      if (sample.length < 15) {
        sample.push({ vid, baslik: data.baslik, reason });
      }
      if (!DRY_RUN) {
        batch.update(d.ref, {
          kayeneFiltrelendi: true,
          filtreliSebep: reason,
          guncellemeTarihi: admin.firestore.FieldValue.serverTimestamp(),
        });
        batchCount++;
        if (batchCount >= 400) {
          await batch.commit();
          batch = db.batch();
          batchCount = 0;
        }
      }
    }
  }

  if (!DRY_RUN && batchCount > 0) await batch.commit();

  console.log('\n========================================');
  console.log(`✓ exclude-missing tamamlandı (DRY=${DRY_RUN})`);
  console.log(`  Vimeo'da yok:        ${missingCount}`);
  console.log(`  Oynatılamıyor:       ${unplayableCount}`);
  console.log(`  Toplam dışlanan:     ${missingCount + unplayableCount}`);
  console.log('========================================');
  if (sample.length > 0) {
    console.log('\nÖrnekler:');
    for (const s of sample) {
      console.log(`  [${s.reason}] ${s.vid} | ${(s.baslik || '').slice(0, 60)}`);
    }
  }
}

main().catch(err => { console.error(err); process.exit(1); });
