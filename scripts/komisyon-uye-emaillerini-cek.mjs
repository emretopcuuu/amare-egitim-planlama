// scripts/komisyon-uye-emaillerini-cek.mjs
// ─────────────────────────────────────────────────────────────────────────
// Komisyon üyelerinin email'lerini iki kaynaktan otomatik çek:
//   1. ADMIN_EMAILS map (src/constants.js)
//   2. Supabase amare_raw_members (full_name → email)
//
// Bulunan email'leri komisyonlar/{id}.uyeler[].email'e yaz, adminEmails türet.
//
// Çalıştırma:
//   node komisyon-uye-emaillerini-cek.mjs            # dry-run
//   node komisyon-uye-emaillerini-cek.mjs --apply    # uygula
// ─────────────────────────────────────────────────────────────────────────

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

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://yvpstkbwglefxukfpgyd.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

const GLOBAL_KOMISYON_ADMINS = [
  's.emretopcu@gmail.com',
  'onlineakademin@gmail.com',
  'furkancite@gmail.com',
];

// Bilinen ad → email map (src/constants.js'ten)
const ADMIN_AD_EMAIL = {
  'emre topcu': 's.emretopcu@gmail.com',
  'toygar senelmis': 'toygarsenelmis@gmail.com',
  'alper kirbiyik': 'alper.kirbiyik@gmail.com',
  'kasim maziliguney': 'kmaziliguney@gmail.com',
  'kasım mazılıgüney': 'kmaziliguney@gmail.com',
  'ilknur akkas': 'ilknurakkas17@gmail.com',
  'giray ulusoy': 'giray70@gmail.com',
  'furkan cite': 'furkancite@gmail.com',
};

const TR_LOWER = { 'Ç': 'c', 'Ğ': 'g', 'İ': 'i', 'I': 'i', 'Ö': 'o', 'Ş': 's', 'Ü': 'u' };
const normalize = (ad) => {
  if (!ad) return '';
  let s = String(ad).normalize('NFC').trim();
  s = s.replace(/^(Prof\.?\s*Dr\.?\s*|Doç\.?\s*Dr\.?\s*|Uzm\.?\s*Dr\.?\s*|Op\.?\s*Dr\.?\s*|Dr\.?\s*|Dt\.?\s*|Dyt\.?\s*|Fzt\.?\s*|Av\.?\s*)/gi, '');
  s = s.replace(/[ÇĞİIÖŞÜçğıöşü]/g, c => TR_LOWER[c.toUpperCase()] || c.toLowerCase());
  s = s.toLowerCase();
  s = s.replace(/[^a-z0-9\s]+/g, ' ').replace(/\s+/g, ' ').trim();
  return s;
};

// Geçerli email mı?
const isValidEmail = (e) =>
  typeof e === 'string'
  && e.includes('@')
  && !e.includes('*')
  && /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(e);

// 1. ADMIN_EMAILS map'ten ara
function findInAdminMap(ad) {
  const n = normalize(ad);
  if (!n) return null;
  const parcalar = n.split(' ').filter(p => p.length > 1);
  // Tam map key match
  for (const [adKey, email] of Object.entries(ADMIN_AD_EMAIL)) {
    if (n === adKey) return email;
  }
  // Ad+soyad substring match
  if (parcalar.length >= 2) {
    const ilk = parcalar[0];
    const son = parcalar[parcalar.length - 1];
    for (const [adKey, email] of Object.entries(ADMIN_AD_EMAIL)) {
      if (adKey.includes(ilk) && adKey.includes(son)) return email;
    }
  }
  return null;
}

// 2. Supabase amare_raw_members'tan ara
async function findInSupabase(ad) {
  if (!SUPABASE_KEY) return null;
  const parcalar = ad
    .replace(/^(Prof\.?\s*Dr\.?\s*|Doç\.?\s*Dr\.?\s*|Uzm\.?\s*Dr\.?\s*|Op\.?\s*Dr\.?\s*|Dr\.?\s*|Dt\.?\s*|Dyt\.?\s*|Fzt\.?\s*|Av\.?\s*)/gi, '')
    .trim().split(/\s+/).filter(p => p.length > 1);
  if (parcalar.length < 2) return null;

  // Ad + soyad ile ilike arama, sonra ilk ad varsa filtre
  const son = parcalar[parcalar.length - 1];
  const ilk = parcalar[0];

  // Türkçe büyük harfler için * pattern
  const pattern = `%${son}%`;
  const url = `${SUPABASE_URL}/rest/v1/amare_raw_members?select=full_name,email&full_name=ilike.${encodeURIComponent(pattern)}&limit=20`;
  try {
    const res = await fetch(url, {
      headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY },
    });
    if (!res.ok) return null;
    const results = await res.json();
    // İlk ad da içeriyor mu?
    const ilkUpper = ilk.toLocaleUpperCase('tr-TR');
    const sonUpper = son.toLocaleUpperCase('tr-TR');
    const matches = results.filter(r => {
      const fnUpper = (r.full_name || '').toLocaleUpperCase('tr-TR');
      return fnUpper.includes(ilkUpper) && fnUpper.includes(sonUpper);
    });
    for (const m of matches) {
      if (isValidEmail(m.email)) return m.email.toLowerCase().trim();
    }
    return null;
  } catch (e) {
    console.warn(`  ⚠️  Supabase hata: ${e.message}`);
    return null;
  }
}

// Email bul (önce admin map, sonra Supabase)
async function findEmail(ad) {
  if (!ad || ad === 'Seçim Aşamasında') return null;
  const adminEmail = findInAdminMap(ad);
  if (adminEmail) return adminEmail;
  const supaEmail = await findInSupabase(ad);
  if (supaEmail) return supaEmail;
  return null;
}

// adminEmails türetme
function turetAdminEmails(uyeler) {
  const set = new Set(GLOBAL_KOMISYON_ADMINS);
  (uyeler || []).forEach(u => {
    const e = String(u.email || '').toLowerCase().trim();
    if (isValidEmail(e)) set.add(e);
  });
  return [...set];
}

async function main() {
  console.log(`[email-cek] başlıyor | APPLY=${APPLY}\n`);
  if (!SUPABASE_KEY) console.log('⚠️  SUPABASE_SERVICE_ROLE_KEY yok — sadece ADMIN_EMAILS map kullanılacak\n');

  const snap = await db.collection('komisyonlar').get();
  console.log(`📚 ${snap.size} komisyon bulundu\n`);

  let toplamUye = 0;
  let bulunan = 0;
  let zaten = 0;
  let bulunmayan = 0;
  const guncellemeler = [];

  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    const uyeler = (data.uyeler || []).slice();
    console.log(`\n═══ ${docSnap.id.toUpperCase()} (${uyeler.length} üye) ═══`);

    let degisti = false;
    for (let i = 0; i < uyeler.length; i++) {
      const u = uyeler[i];
      toplamUye++;
      if (u.email && isValidEmail(u.email)) {
        zaten++;
        console.log(`  ✓ ${u.ad.padEnd(40)} → ${u.email}  (zaten var)`);
        continue;
      }
      const email = await findEmail(u.ad);
      if (email) {
        uyeler[i] = { ...u, email };
        degisti = true;
        bulunan++;
        const src = findInAdminMap(u.ad) ? '[admin-map]' : '[supabase]';
        console.log(`  📧 ${u.ad.padEnd(40)} → ${email}  ${src}`);
      } else {
        bulunmayan++;
        console.log(`  ✗ ${u.ad.padEnd(40)} → bulunamadı`);
      }
    }

    if (degisti) {
      const adminEmails = turetAdminEmails(uyeler);
      guncellemeler.push({ id: docSnap.id, uyeler, adminEmails });
    }
  }

  console.log(`\n═══════════════════════════════════════════════════════`);
  console.log(`📊 Toplam ${toplamUye} üye:`);
  console.log(`   ✓ Zaten email'i var:  ${zaten}`);
  console.log(`   📧 Yeni eklenecek:    ${bulunan}`);
  console.log(`   ✗ Bulunamadı:         ${bulunmayan}`);
  console.log(`\n${guncellemeler.length} komisyon güncellenecek`);

  if (!APPLY) {
    console.log('\n⚠️  DRY-RUN — yazma için: --apply');
    return;
  }

  console.log('\n💾 Firestore yazılıyor...');
  for (const g of guncellemeler) {
    await db.collection('komisyonlar').doc(g.id).set({
      uyeler: g.uyeler,
      adminEmails: g.adminEmails,
      guncellemeTarihi: admin.firestore.FieldValue.serverTimestamp(),
      guncelleyenEmail: 's.emretopcu@gmail.com (cli email-cek)',
    }, { merge: true });
    console.log(`   ✓ ${g.id} (${g.adminEmails.length} admin email)`);
  }
  console.log('\n✅ Bitti.');
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
