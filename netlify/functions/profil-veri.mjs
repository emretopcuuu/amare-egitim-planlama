// netlify/functions/profil-veri.mjs
// ─────────────────────────────────────────────────────────────────────────
// GET /.netlify/functions/profil-veri
//   Header: Authorization: Bearer <Firebase ID Token>
//
// Login olmuş kullanıcının profil için ihtiyaç duyduğu Supabase verilerini
// (amare_raw_members + members + progress) tek istekte birleşik döner.
//
// Güvenlik:
//   1. Firebase ID Token doğrulanır → uid alınır
//   2. uid'in users/{uid}.amareId Firestore'dan okunur
//   3. Sadece o amare_id ile sorgu yapılır — başkasının profilini çekemez
//
// Response: { amare, member, progress } veya { error }
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
// amare_raw_members RLS aktif — anon key boş döner, service role gerek
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

async function supabaseGet(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'private, max-age=60',
      ...CORS_HEADERS,
    },
  });
}

export default async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  try {
    // 1. Bearer token al
    const authHeader = req.headers.get('authorization') || '';
    const m = authHeader.match(/^Bearer\s+(.+)$/i);
    if (!m) {
      return jsonResponse({ error: 'Yetkisiz: token yok' }, 401);
    }
    const idToken = m[1];

    // 2. Token doğrula → uid
    let decoded;
    try {
      decoded = await admin.auth().verifyIdToken(idToken);
    } catch (e) {
      return jsonResponse({ error: 'Yetkisiz: token geçersiz' }, 401);
    }
    const uid = decoded.uid;

    // 3. users/{uid}.amareId Firestore'dan oku
    const userDoc = await admin.firestore().doc(`users/${uid}`).get();
    if (!userDoc.exists) {
      return jsonResponse({ error: 'Profil bulunamadı — Amare hesap bağlı değil' }, 404);
    }
    const userData = userDoc.data() || {};
    const amareId = userData.amareId;
    if (!amareId) {
      return jsonResponse({
        error: 'Amare ID bağlı değil',
        hint: 'Marka Ortağı Girişi yap veya onboarding\'den gel.',
      }, 404);
    }

    const amareIdStr = String(amareId);

    // 4. Supabase paralel sorgu — amare_raw_members + members
    const [amareRows, memberRows] = await Promise.all([
      supabaseGet(
        `amare_raw_members?select=amare_id,full_name,email,phone,country,enrollment_date,rank,enroller_amare_id,sponsor_amare_id,raw_data&` +
        `amare_id=eq.${encodeURIComponent(amareIdStr)}&limit=1`
      ),
      supabaseGet(
        `members?select=id,full_name,bio,phone,email,status,current_screen,sponsor_id,created_at,last_active_at&` +
        `amare_id=eq.${encodeURIComponent(amareIdStr)}&order=last_active_at.desc&limit=1`
      ),
    ]);

    const amare = (amareRows && amareRows[0]) || null;
    const member = (memberRows && memberRows[0]) || null;

    // members.bio: yeni format JSON { yas, meslek, heyecan, tanitim, bio_metin, v:1 }
    // eski format: düz string. Backward-compatible parse:
    if (member && member.bio && typeof member.bio === 'string') {
      const trimmed = member.bio.trim();
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (parsed && typeof parsed === 'object') {
            member.bio_data = parsed; // yapılandırılmış cevaplar
            member.bio = parsed.bio_metin || ''; // gösterim için düz metin
          }
        } catch {
          // JSON değil, düz string olarak bırak
        }
      }
    }

    // 4b. Sponsor bilgisi — enroller_amare_id veya sponsor_amare_id ile ikinci sorgu
    if (amare) {
      const sponsorId = amare.enroller_amare_id
        || amare.sponsor_amare_id
        || amare.raw_data?.enroller_amare_id
        || amare.raw_data?.sponsor_amare_id;
      if (sponsorId) {
        try {
          const sponsorRows = await supabaseGet(
            `amare_raw_members?select=amare_id,full_name,phone,raw_data&` +
            `amare_id=eq.${encodeURIComponent(String(sponsorId))}&limit=1`
          );
          const sp = sponsorRows && sponsorRows[0];
          if (sp) {
            amare.sponsor_full_name = sp.full_name || sp.raw_data?.full_name
              || amare.raw_data?.enroller_name
              || amare.raw_data?.sponsor_name_text
              || null;
            amare.sponsor_phone = sp.phone || sp.raw_data?.phone || null;
            amare.sponsor_amare_id = sp.amare_id;
          } else {
            // Sponsor amare_raw_members'ta yoksa raw_data'dan al
            amare.sponsor_full_name = amare.raw_data?.enroller_name || amare.raw_data?.sponsor_name_text || null;
          }
        } catch (e) {
          console.warn('[profil-veri] sponsor lookup err:', e.message);
        }
      }
      // enrollment_date → register_date alias (frontend uyumu)
      amare.register_date = amare.enrollment_date || amare.raw_data?.enroll_date || amare.raw_data?.enrollment_date || null;
    }

    // 5. progress (varsa, member.id ile)
    let progress = null;
    if (member?.id) {
      try {
        const progressRows = await supabaseGet(
          `progress?select=quiz_score,training_done,completion_pct,career_done,career_target,time_target,hours_daily,funnel_answers,profile_done,funnel_done,updated_at&` +
          `member_id=eq.${encodeURIComponent(member.id)}&limit=1`
        );
        progress = (progressRows && progressRows[0]) || null;

        // progress → member.career_data synth
        if (progress && member && progress.career_target) {
          member.career_data = {
            rank: progress.career_target,
            time: progress.time_target || null,
            hours: progress.hours_daily || null,
          };
        }
        // member alias: status='completed' → onboarding_completed_at,
        // completion_pct → progress_pct (frontend uyumu)
        if (member) {
          member.onboarding_completed_at = member.status === 'completed' ? member.last_active_at : null;
          member.progress_pct = progress?.completion_pct ?? null;
        }
      } catch (e) {
        console.warn('[profil-veri] progress fetch skipped:', e.message);
      }
    }

    // 7. Onboarding tamamlanma flag'i — Faz 3 gating mantığı için.
    // member.status === 'completed' VEYA progress.training_done === true ise tamam.
    // member kaydı yoksa = onboarding hiç başlamamış (eski üye)
    const onboardingTamamlandi = !!(
      member?.status === 'completed'
      || progress?.training_done === true
    );
    const onboardingBaslatilmis = !!member;

    // 6. Üyelik süresi hesapla
    let uyelikSuresi = null;
    if (amare?.register_date) {
      const d = new Date(amare.register_date);
      const now = new Date();
      const ay = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
      const yil = Math.floor(ay / 12);
      const kalanAy = ay % 12;
      uyelikSuresi = { yil, ay: kalanAy, toplamAy: ay };
    }

    return jsonResponse({
      amareId: amareIdStr,
      amare,
      member,
      progress,
      uyelikSuresi,
      onboardingTamamlandi,
      onboardingBaslatilmis,
    });

  } catch (err) {
    console.error('[profil-veri] hata:', err.message, err.stack);
    return jsonResponse({
      error: 'Sistem hatası',
      detail: err.message.slice(0, 200),
    }, 500);
  }
};
