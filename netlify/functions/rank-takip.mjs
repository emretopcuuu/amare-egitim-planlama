// netlify/functions/rank-takip.mjs
// ─────────────────────────────────────────────────────────────────────────
// Günlük scheduled function — kullanıcıların Amare DB rank'ini takip eder,
// değişmişse Firestore'da users/{uid}/egitim_durumu/profil dokumanını
// günceller (önceki rank'leri otoTamamlandi=true, yeni rank acildi=true).
//
// Triggerlar:
//   - Netlify schedule (her gün 03:00 UTC)
//   - Manuel POST tetikleyici (admin testi için)
// ─────────────────────────────────────────────────────────────────────────

import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    }),
  });
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

// Rank schema (backend tarafı, frontend ile uyumlu)
const RANK_SIRALAMA = [
  { key: 'brand_partner',        label: 'Brand Partner',        sira: 1 },
  { key: 'brand_builder',        label: 'Brand Builder',        sira: 2 },
  { key: 'bronze',               label: 'Bronze',               sira: 3 },
  { key: 'silver',               label: 'Silver',               sira: 4 },
  { key: 'gold',                 label: 'Gold',                 sira: 5 },
  { key: 'platinum',             label: 'Platinum',             sira: 6 },
  { key: 'leader',               label: 'Leader',               sira: 7 },
  { key: 'senior_leader',        label: 'Senior Leader',        sira: 8 },
  { key: 'executive_leader',     label: 'Executive Leader',     sira: 9 },
  { key: 'diamond',              label: 'Diamond',              sira: 10 },
  { key: 'one_star_diamond',     label: '1-Star Diamond',       sira: 11 },
  { key: 'two_star_diamond',     label: '2-Star Diamond',       sira: 12 },
  { key: 'three_star_diamond',   label: '3-Star Diamond',       sira: 13 },
  { key: 'presidential_diamond', label: 'Presidential Diamond', sira: 14 },
];

function rankStringToKey(s) {
  if (!s || typeof s !== 'string') return null;
  const norm = s.toLowerCase().trim().replace(/-/g, ' ').replace(/\s+/g, ' ');
  const numToWord = { '1': 'one', '2': 'two', '3': 'three' };
  const altNorm = norm.replace(/^(\d)(\s+star)/, (_, n, rest) => (numToWord[n] || n) + rest);
  for (const r of RANK_SIRALAMA) {
    const labelNorm = r.label.toLowerCase().replace(/-/g, ' ');
    if (labelNorm === norm || labelNorm === altNorm) return r.key;
    if (r.key === norm.replace(/\s+/g, '_')) return r.key;
    if (r.key === altNorm.replace(/\s+/g, '_')) return r.key;
  }
  return null;
}

async function supabaseGet(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

// Tek kullanıcının rank durumunu hesaplayıp Firestore'a yaz
async function tekKullaniciIsle(uid, amareId) {
  const rows = await supabaseGet(
    `amare_raw_members?select=rank,raw_data&amare_id=eq.${encodeURIComponent(amareId)}&limit=1`
  );
  const amare = rows?.[0];
  if (!amare) return { uid, skip: 'no_amare_row' };

  const rankStr = amare.rank || amare.raw_data?.career_rank || null;
  const yeniRankKey = rankStringToKey(rankStr);
  if (!yeniRankKey) return { uid, skip: 'unknown_rank', rankStr };

  // Firestore'dan mevcut durumu oku
  const docRef = admin.firestore().doc(`users/${uid}/egitim_durumu/profil`);
  const snap = await docRef.get();
  const mevcut = snap.exists ? snap.data() : null;

  if (mevcut?.mevcutRank === yeniRankKey) {
    // Değişiklik yok — sadece son kontrol zamanını güncelle
    await docRef.set({ sonRankKontrolu: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    return { uid, skip: 'no_change', rank: yeniRankKey };
  }

  // Rank değişti veya ilk kez işleniyor
  const yeniRank = RANK_SIRALAMA.find(r => r.key === yeniRankKey);
  const yollar = mevcut?.yollar || {};

  // Önceki rank'leri otoTamamlandi=true yap
  for (const r of RANK_SIRALAMA) {
    if (r.sira < yeniRank.sira) {
      if (!yollar[r.key]) yollar[r.key] = {};
      yollar[r.key].acildi = true;
      yollar[r.key].otoTamamlandi = true;
      yollar[r.key].tamamlanmaOrani = 100;
      if (!yollar[r.key].tamamlanmaTarihi) {
        yollar[r.key].tamamlanmaTarihi = admin.firestore.Timestamp.now();
      }
    }
  }

  // Yeni rank'i aç (eğer ilk kez ise)
  if (!yollar[yeniRankKey]) yollar[yeniRankKey] = {};
  yollar[yeniRankKey].acildi = true;
  if (!yollar[yeniRankKey].tamamlanmaOrani) yollar[yeniRankKey].tamamlanmaOrani = 0;

  await docRef.set({
    mevcutRank: yeniRankKey,
    mevcutRankLabel: yeniRank.label,
    onceki: mevcut?.mevcutRank || null,
    yollar,
    sonRankKontrolu: admin.firestore.FieldValue.serverTimestamp(),
    sonRankDegisikligi: mevcut?.mevcutRank !== yeniRankKey ? admin.firestore.FieldValue.serverTimestamp() : (mevcut?.sonRankDegisikligi || null),
  }, { merge: true });

  return {
    uid,
    onceki: mevcut?.mevcutRank || null,
    yeni: yeniRankKey,
    degisiklik: !mevcut?.mevcutRank ? 'ilk_kayit' : 'rank_atladi',
  };
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

  try {
    const url = new URL(req.url);
    const singleUid = url.searchParams.get('uid');

    // Tek kullanıcı modu (profil sayfası anında tetiklemek için)
    if (singleUid) {
      // İstek atan kullanıcı kendi uid'iyle eşleşmeli
      const auth = req.headers.get('authorization') || '';
      const m = auth.match(/^Bearer\s+(.+)$/i);
      if (!m) return new Response(JSON.stringify({ error: 'token gerekli' }), { status: 401, headers: { 'Content-Type': 'application/json', ...CORS } });
      const decoded = await admin.auth().verifyIdToken(m[1]);
      if (decoded.uid !== singleUid) return new Response(JSON.stringify({ error: 'yetkisiz' }), { status: 403, headers: { 'Content-Type': 'application/json', ...CORS } });

      const userDoc = await admin.firestore().doc(`users/${singleUid}`).get();
      const amareId = userDoc.data()?.amareId;
      if (!amareId) return new Response(JSON.stringify({ error: 'amare_id yok' }), { status: 404, headers: { 'Content-Type': 'application/json', ...CORS } });

      const result = await tekKullaniciIsle(singleUid, amareId);
      return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json', ...CORS } });
    }

    // Toplu modu — Firestore'daki tüm kullanıcıları işle
    const usersSnap = await admin.firestore().collection('users').get();
    const results = { isleendi: 0, atlandi: 0, ilkKayit: 0, rankAtladi: 0, hatalar: [] };

    for (const userDoc of usersSnap.docs) {
      const uid = userDoc.id;
      const amareId = userDoc.data()?.amareId;
      if (!amareId) { results.atlandi++; continue; }

      try {
        const r = await tekKullaniciIsle(uid, amareId);
        results.isleendi++;
        if (r.skip) results.atlandi++;
        else if (r.degisiklik === 'ilk_kayit') results.ilkKayit++;
        else if (r.degisiklik === 'rank_atladi') results.rankAtladi++;
      } catch (e) {
        results.hatalar.push({ uid, hata: e.message });
      }
    }

    return new Response(JSON.stringify({
      tarih: new Date().toISOString(),
      ...results,
    }), { headers: { 'Content-Type': 'application/json', ...CORS } });

  } catch (err) {
    console.error('[rank-takip] hata:', err.message, err.stack);
    return new Response(JSON.stringify({ error: 'Sistem hatası', detail: err.message.slice(0, 200) }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...CORS } });
  }
};

// Netlify scheduled function — günlük 03:00 UTC
export const config = {
  schedule: '0 3 * * *',
};
