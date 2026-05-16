// netlify/functions/ekibim.mjs
// ─────────────────────────────────────────────────────────────────────────
// GET /.netlify/functions/ekibim
//   Authorization: Bearer <Firebase ID Token>
//
// Sponsor'un (login user) ekibindeki üyeleri 4 metrik ile döner:
//   1. Curriculum tamamlanma % (egitim_durumu)
//   2. Son aktivite (kaç gün önce)
//   3. Risk skoru (Aktif/Yavaşladı/Risk/Pasif)
//   4. Streak + toplam izleme saati
//
// Sponsor = current user'ın amareId'siyle
//   amare_raw_members.enroller_amare_id veya sponsor_amare_id eşleşenler
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

async function supabaseGet(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

function daysSince(ts) {
  if (!ts) return null;
  let date;
  if (ts._seconds) date = new Date(ts._seconds * 1000);
  else if (ts.toMillis) date = new Date(ts.toMillis());
  else if (ts instanceof Date) date = ts;
  else if (typeof ts === 'string') date = new Date(ts);
  else return null;
  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
}

// Risk skoru: 0=Pasif, 1=Risk, 2=Yavaşladı, 3=Aktif
function riskHesapla(sonAktiviteGun) {
  if (sonAktiviteGun === null) return { skor: 0, etiket: 'pasif', renk: 'slate' };
  if (sonAktiviteGun <= 3) return { skor: 3, etiket: 'aktif', renk: 'emerald' };
  if (sonAktiviteGun <= 7) return { skor: 3, etiket: 'aktif', renk: 'emerald' };
  if (sonAktiviteGun <= 14) return { skor: 2, etiket: 'yavasladi', renk: 'amber' };
  return { skor: 1, etiket: 'risk', renk: 'rose' };
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

  try {
    // 1. Bearer token al
    const auth = req.headers.get('authorization') || '';
    const m = auth.match(/^Bearer\s+(.+)$/i);
    if (!m) return new Response(JSON.stringify({ error: 'Token gerekli' }), {
      status: 401, headers: { 'Content-Type': 'application/json', ...CORS }
    });

    let decoded;
    try { decoded = await admin.auth().verifyIdToken(m[1]); }
    catch { return new Response(JSON.stringify({ error: 'Geçersiz token' }), {
      status: 401, headers: { 'Content-Type': 'application/json', ...CORS }
    }); }

    const uid = decoded.uid;

    // 2. users/{uid}.amareId
    const userDoc = await admin.firestore().doc(`users/${uid}`).get();
    if (!userDoc.exists) return new Response(JSON.stringify({ error: 'Profil yok' }), {
      status: 404, headers: { 'Content-Type': 'application/json', ...CORS }
    });
    const amareId = userDoc.data().amareId;
    if (!amareId) return new Response(JSON.stringify({ error: 'Amare ID bağlı değil' }), {
      status: 404, headers: { 'Content-Type': 'application/json', ...CORS }
    });

    // 3. Sponsor altındaki üyeleri Amare DB'den çek
    // enroller_amare_id eq amareId VEYA sponsor_amare_id eq amareId
    // Supabase OR ile: or=(enroller_amare_id.eq.X,sponsor_amare_id.eq.X)
    const amareIdStr = String(amareId);
    const ekipRows = await supabaseGet(
      `amare_raw_members?select=amare_id,full_name,email,phone,country,enrollment_date,rank,enroller_amare_id,sponsor_amare_id,raw_data&` +
      `or=(enroller_amare_id.eq.${encodeURIComponent(amareIdStr)},sponsor_amare_id.eq.${encodeURIComponent(amareIdStr)})&` +
      `limit=500`
    );

    if (!ekipRows || ekipRows.length === 0) {
      return new Response(JSON.stringify({
        amareId: amareIdStr,
        toplam: 0,
        ekip: [],
      }), { headers: { 'Content-Type': 'application/json', ...CORS } });
    }

    // 4. Her ekip üyesi için Firestore'da users/{uid} bul (amareId eşleşmesiyle)
    // Toplu query: where('amareId', 'in', [...]) — max 30 per query
    const allAmareIds = ekipRows.map(r => String(r.amare_id));
    const userMap = {}; // amareId -> { uid, streak, fotoURL, lastSeen }

    // Firestore in query 30'ar batch
    for (let i = 0; i < allAmareIds.length; i += 30) {
      const batch = allAmareIds.slice(i, i + 30);
      try {
        const snap = await admin.firestore()
          .collection('users')
          .where('amareId', 'in', batch)
          .get();
        snap.forEach(doc => {
          const d = doc.data();
          userMap[String(d.amareId)] = {
            uid: doc.id,
            fotoURL: d.fotoURL || null,
            displayName: d.displayName || null,
            sonGiris: d.sonGiris || null,
            streak: d.streak || null,
            ilkGiris: d.ilkGiris || null,
          };
        });
      } catch (e) {
        console.warn('[ekibim] user batch err:', e.message);
      }
    }

    // 5. Her ekip üyesi için egitim_durumu çek (aktif rank %)
    const allUids = Object.values(userMap).map(u => u.uid);
    const egitimMap = {}; // uid -> { mevcutRank, tamamlanmaOrani }
    for (const targetUid of allUids) {
      try {
        const ed = await admin.firestore().doc(`users/${targetUid}/egitim_durumu/profil`).get();
        if (ed.exists) {
          const d = ed.data();
          const aktif = d.yollar?.[d.mevcutRank];
          egitimMap[targetUid] = {
            mevcutRank: d.mevcutRank,
            mevcutRankLabel: d.mevcutRankLabel,
            tamamlanmaOrani: aktif?.tamamlanmaOrani ?? 0,
          };
        }
      } catch {}
    }

    // 6. Sonuçları birleştir
    const ekip = ekipRows.map(r => {
      const aId = String(r.amare_id);
      const user = userMap[aId];
      const egitim = user ? egitimMap[user.uid] : null;
      const sonAktiviteGun = user?.sonGiris ? daysSince(user.sonGiris) : null;
      const risk = riskHesapla(sonAktiviteGun);
      const izlemeSaat = user?.streak ? Math.floor((user.streak.total || 0) * 0.5) : 0; // estimate

      return {
        amareId: aId,
        adSoyad: r.full_name || r.raw_data?.full_name || '?',
        email: r.email || null,
        phone: r.phone || null,
        rank: r.rank || r.raw_data?.career_rank || null,
        kayitTarihi: r.enrollment_date || r.raw_data?.enrollment_date || null,
        // Site etkileşimi
        siteSet: !!user,
        sonAktiviteGun,
        streak: user?.streak || null,
        izlemeSaat,
        curriculumPct: egitim?.tamamlanmaOrani ?? null,
        mevcutEgitimRank: egitim?.mevcutRankLabel ?? null,
        fotoURL: user?.fotoURL || null,
        risk,
      };
    });

    // Risk skoruna göre sırala (en riskli üstte, sonra yavaşladı, sonra aktif, pasif en son)
    // Aktiflar arasında curriculum % azalan
    ekip.sort((a, b) => {
      // Risk önceliği: risk(1) > yavasladi(2) > aktif(3) > pasif(0)
      const prio = { 1: 0, 2: 1, 3: 2, 0: 3 };
      const aP = prio[a.risk.skor] ?? 4;
      const bP = prio[b.risk.skor] ?? 4;
      if (aP !== bP) return aP - bP;
      return (a.curriculumPct ?? 0) - (b.curriculumPct ?? 0);
    });

    return new Response(JSON.stringify({
      amareId: amareIdStr,
      toplam: ekip.length,
      ozet: {
        aktif: ekip.filter(e => e.risk.etiket === 'aktif').length,
        yavasladi: ekip.filter(e => e.risk.etiket === 'yavasladi').length,
        risk: ekip.filter(e => e.risk.etiket === 'risk').length,
        pasif: ekip.filter(e => e.risk.etiket === 'pasif').length,
        siteyiKullanan: ekip.filter(e => e.siteSet).length,
      },
      ekip,
    }), { headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'private, max-age=120',
      ...CORS,
    }});

  } catch (err) {
    console.error('[ekibim] hata:', err.message, err.stack);
    return new Response(JSON.stringify({ error: 'Sistem hatası', detail: err.message.slice(0, 200) }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...CORS } });
  }
};
