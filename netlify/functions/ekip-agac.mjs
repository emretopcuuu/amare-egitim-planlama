// netlify/functions/ekip-agac.mjs
// ─────────────────────────────────────────────────────────────────────────
// GET /.netlify/functions/ekip-agac
//   Authorization: Bearer <Firebase ID Token>
//   Query: ?maxNesil=3 (1-5, default 3)
//
// Sponsor için 3 nesil derinlikte downline ağacı.
// Her node: amareId, ad, rank, pv, gv, çocuk sayısı.
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

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

async function supabaseGet(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

function pvFromRaw(r) {
  return Number(r?.pv ?? r?.personal_volume ?? r?.PV ?? r?.qualifying_pv ?? 0) || 0;
}
function gvFromRaw(r) {
  return Number(r?.gv ?? r?.group_volume ?? r?.GV ?? r?.team_volume ?? 0) || 0;
}

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

  try {
    // 1. Auth
    const auth = req.headers.get('authorization') || '';
    const m = auth.match(/^Bearer\s+(.+)$/i);
    if (!m) return new Response(JSON.stringify({ error: 'Token gerekli' }), {
      status: 401, headers: { 'Content-Type': 'application/json', ...CORS },
    });
    let decoded;
    try { decoded = await admin.auth().verifyIdToken(m[1]); }
    catch { return new Response(JSON.stringify({ error: 'Geçersiz token' }), {
      status: 401, headers: { 'Content-Type': 'application/json', ...CORS },
    }); }
    const uid = decoded.uid;

    // 2. Sponsor amareId
    const userDoc = await admin.firestore().doc(`users/${uid}`).get();
    if (!userDoc.exists) return new Response(JSON.stringify({ error: 'Profil yok' }), {
      status: 404, headers: { 'Content-Type': 'application/json', ...CORS },
    });
    const sponsorAmareId = String(userDoc.data().amareId || '');
    if (!sponsorAmareId) return new Response(JSON.stringify({ error: 'Amare ID bağlı değil' }), {
      status: 404, headers: { 'Content-Type': 'application/json', ...CORS },
    });

    // 3. Max nesil
    const url = new URL(req.url);
    const maxNesil = Math.min(5, Math.max(1, parseInt(url.searchParams.get('maxNesil') || '3', 10)));

    // 4. Nesil nesil downline çek
    const FIELDS = 'amare_id,full_name,rank,enroller_amare_id,sponsor_amare_id,enrollment_date,raw_data';
    const nesiller = [];          // [Map<amareId, node>, ...] her seviye
    let mevcutSeviyeIds = [sponsorAmareId];

    for (let seviye = 0; seviye < maxNesil; seviye++) {
      if (mevcutSeviyeIds.length === 0) break;

      // Bu seviye için Supabase'den downline'ı çek
      // Chunk: max 50 ID per query
      const result = [];
      for (let i = 0; i < mevcutSeviyeIds.length; i += 50) {
        const chunk = mevcutSeviyeIds.slice(i, i + 50);
        const idsParam = chunk.map(id => `"${id}"`).join(',');
        try {
          const rows = await supabaseGet(
            `amare_raw_members?select=${FIELDS}&` +
            `or=(enroller_amare_id.in.(${idsParam}),sponsor_amare_id.in.(${idsParam}))&` +
            `limit=2000`
          );
          result.push(...rows);
        } catch (e) {
          console.warn('[ekip-agac] chunk fetch err:', e.message);
        }
      }

      // Map'e ekle
      const map = new Map();
      result.forEach(r => {
        const aId = String(r.amare_id);
        map.set(aId, {
          amareId: aId,
          ad: r.full_name || r.raw_data?.full_name || '?',
          rank: r.rank || r.raw_data?.career_rank || null,
          enroller: String(r.enroller_amare_id || r.sponsor_amare_id || ''),
          kayitTarihi: r.enrollment_date || null,
          pv: pvFromRaw(r.raw_data),
          gv: gvFromRaw(r.raw_data),
          cocuklar: [],
        });
      });
      nesiller.push(map);
      mevcutSeviyeIds = [...map.keys()];
    }

    // 5. Ağaç inşa et — root sponsorAmareId'den başla
    // Her node'un cocuklar'ına alt seviyeyi ekle
    function dolu(parentId, derinlik) {
      if (derinlik >= nesiller.length) return [];
      const seviye = nesiller[derinlik];
      const cocuklar = [];
      seviye.forEach(node => {
        if (node.enroller === parentId) {
          cocuklar.push({
            ...node,
            derinlik: derinlik + 1,
            cocuklar: dolu(node.amareId, derinlik + 1),
          });
        }
      });
      // Sırala: önce çocuk sayısı çok olan, sonra GV yüksek
      cocuklar.sort((a, b) => (b.cocuklar.length - a.cocuklar.length) || (b.gv - a.gv));
      return cocuklar;
    }

    const root = {
      amareId: sponsorAmareId,
      ad: userDoc.data().displayName || userDoc.data().adSoyad || 'Sen',
      rank: null,
      derinlik: 0,
      cocuklar: dolu(sponsorAmareId, 0),
    };

    // 6. Özet — nesil başına sayım
    const ozet = nesiller.map((s, i) => ({
      nesil: i + 1,
      sayi: s.size,
      toplamGv: [...s.values()].reduce((acc, n) => acc + n.gv, 0),
      toplamPv: [...s.values()].reduce((acc, n) => acc + n.pv, 0),
    }));
    const toplamUye = nesiller.reduce((acc, s) => acc + s.size, 0);

    return new Response(JSON.stringify({
      sponsorAmareId,
      maxNesil,
      toplamUye,
      ozet,
      root,
    }), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'private, max-age=300', ...CORS } });

  } catch (err) {
    console.error('[ekip-agac] hata:', err.message, err.stack);
    return new Response(JSON.stringify({ error: 'Sistem hatası', detail: err.message.slice(0, 200) }), {
      status: 500, headers: { 'Content-Type': 'application/json', ...CORS },
    });
  }
};
