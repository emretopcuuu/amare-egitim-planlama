// scripts/exclude-restricted-vimeo.mjs
// ─────────────────────────────────────────────────────────────────────────
// Vimeo privacy ayarları nedeniyle public embed çalışmayan video'ları dışla:
//   - password: şifre sorar
//   - nobody: kimse izleyemez
//   - contacts: sadece kontaklar
//   - disable + embed != public: erişim kısıtlı
//
// İdempotent. Re-run sadece yeni eklenenleri yakalar.
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

async function fetchPrivacy() {
  const map = new Map();
  let url = '/me/videos?per_page=100&page=1&fields=uri,privacy';
  let page = 0;
  while (url) {
    page++;
    process.stdout.write(`\r[vimeo] sayfa ${page}...`);
    const data = await vimeoFetch(url);
    for (const v of (data.data || [])) {
      const id = String(v.uri || '').split('/').pop();
      if (id) map.set(id, v.privacy || {});
    }
    url = data.paging?.next || null;
  }
  console.log(`\n[vimeo] ${map.size} video privacy bilgisi alındı`);
  return map;
}

function checkRestricted(privacy) {
  if (!privacy) return null;
  const view = privacy.view;
  const embed = privacy.embed;
  // İframe'de açılmaz / kullanıcı izleyemez
  if (view === 'password') return 'Vimeo: şifre korumalı';
  if (view === 'nobody') return 'Vimeo: erişim yok (nobody)';
  if (view === 'contacts') return 'Vimeo: sadece kontaklar';
  if (embed === 'private') return 'Vimeo: embed kapalı';
  if (embed === 'whitelist') return 'Vimeo: embed whitelist (sadece belirli domainler)';
  return null;
}

async function main() {
  console.log(`[exclude-restricted] başladı | DRY=${DRY_RUN}`);

  const privacyMap = await fetchPrivacy();
  const snap = await db.collection('kayitli_egitimler').where('kayeneFiltrelendi', '==', false).get();
  console.log(`[firestore] ${snap.size} aktif doc`);

  let batch = db.batch();
  let batchCount = 0;
  const counts = {};
  const sample = [];
  let total = 0;

  for (const d of snap.docs) {
    const data = d.data();
    const vid = data.vimeoId || d.id;
    const privacy = privacyMap.get(vid);
    const reason = checkRestricted(privacy);
    if (!reason) continue;

    counts[reason] = (counts[reason] || 0) + 1;
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
    total++;
  }

  if (!DRY_RUN && batchCount > 0) await batch.commit();

  console.log('\n========================================');
  console.log(`✓ tamamlandı (DRY=${DRY_RUN})`);
  console.log(`  Dışlanan toplam: ${total}`);
  for (const [k, v] of Object.entries(counts)) {
    console.log(`    ${v.toString().padStart(3)} | ${k}`);
  }
  console.log('========================================');
  if (sample.length > 0) {
    console.log('\nÖrnekler:');
    for (const s of sample) {
      console.log(`  [${s.reason}] ${s.vid} | ${(s.baslik || '').slice(0, 55)}`);
    }
  }
}

main().catch(err => { console.error(err); process.exit(1); });
