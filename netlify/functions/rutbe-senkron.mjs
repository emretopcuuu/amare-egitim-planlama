// Otomatik rütbe algılama + kutlama akışı (günlük cron, 09:30 Europe/Istanbul).
//
// Ne yapar:
//   1. konusmacilar'dan email'i kayıtlı liderleri alır (email = güvenli eşleşme anahtarı)
//   2. Supabase amare_raw_members'tan bu email'lerin GÜNCEL rank'ini çeker
//   3. Amare rank'i sistemdeki son kariyer basamağından YÜKSEKSE (terfi):
//        - kariyerGecmis'e yeni basamağı ekler (tarih = bu ay)
//        - rutbe_degisimleri koleksiyonuna loglar (idempotent: coreId_kariyer doc id)
//        - Admin'e tek toplu kutlama maili atar (profil linki + "başarı kartını indir")
//   4. Rütbe DÜŞÜŞÜNDE veriye DOKUNMAZ — sadece mailde bilgi verir (hassas konu, insan kararı)
//
// GÜVENLİK: haftalik-bulten deseni — Netlify cron payload'ı bypass;
// manuel HTTP tetik için RUTBE_TRIGGER_SECRET header'ı zorunlu; yoksa 403.

import admin from 'firebase-admin';
import { Resend } from 'resend';

export const config = { schedule: '30 6 * * *' }; // 09:30 Istanbul

const RANKS = ['BRAND PARTNER', 'BRAND BUILDER', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'LEADER', 'SENIOR LEADER', 'EXECUTIVE LEADER', 'DIAMOND', '1 STAR DIAMOND', '2 STAR DIAMOND', '3 STAR DIAMOND', 'PRESIDENTIAL DIAMOND'];
const nrank = (r) => String(r || '').toUpperCase()
  .replace(/İ/g, 'I').replace(/-/g, ' ').replace(/YILDIZ/g, 'STAR')
  .replace(/PRESIDENTAL/g, 'PRESIDENTIAL').replace(/\s+/g, ' ').trim();
const rankSira = (r) => RANKS.indexOf(nrank(r));

function initFirebase() {
  if (admin.apps.length) return admin.firestore();
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    }),
  });
  return admin.firestore();
}

const yetkiliMi = (event) => {
  try {
    const body = event.body ? JSON.parse(event.body) : null;
    if (body && (body.next_run || body.last_run)) return true; // Netlify cron payload
  } catch {}
  const secret = process.env.RUTBE_TRIGGER_SECRET;
  return !!secret && event.headers?.['x-trigger-secret'] === secret;
};

export const handler = async (event) => {
  if (!yetkiliMi(event)) return { statusCode: 403, body: 'forbidden' };

  const db = initFirebase();
  const SB_URL = process.env.SUPABASE_URL;
  const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
  if (!SB_URL || !SB_KEY) return { statusCode: 500, body: 'supabase env eksik' };

  // 1) Email'i olan liderler
  const snap = await db.collection('konusmacilar').get();
  const liderler = [];
  snap.forEach(d => {
    const k = d.data();
    if (k.email) liderler.push({ id: d.id, ad: k.ad || d.id, email: String(k.email).trim().toLowerCase(), kariyerGecmis: Array.isArray(k.kariyerGecmis) ? k.kariyerGecmis : [] });
  });
  if (!liderler.length) return { statusCode: 200, body: 'email kayıtlı lider yok' };

  // 2) Amare güncel rank (email in-filter; aynı email'in çoklu kaydında EN YÜKSEK rank)
  const emails = [...new Set(liderler.map(l => l.email))];
  const amareRank = new Map(); // email -> en yüksek sira
  const CHUNK = 40;
  for (let i = 0; i < emails.length; i += CHUNK) {
    const grup = emails.slice(i, i + CHUNK);
    const inParam = grup.map(e => `"${e.replace(/"/g, '')}"`).join(',');
    const url = `${SB_URL}/rest/v1/amare_raw_members?select=email,rank&email=in.(${encodeURIComponent(inParam)})`;
    const res = await fetch(url, { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } });
    if (!res.ok) continue;
    for (const m of await res.json()) {
      const e = String(m.email || '').trim().toLowerCase();
      const s = rankSira(m.rank); // sayısal/garip rank'ler -1 → yok sayılır
      if (s < 0) continue;
      if (!amareRank.has(e) || s > amareRank.get(e)) amareRank.set(e, s);
    }
  }

  // 3) Karşılaştır
  const now = new Date();
  const buAy = `${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()}`;
  const terfiler = [], dusmeler = [];
  for (const l of liderler) {
    const amareSira = amareRank.get(l.email);
    if (amareSira == null) continue;
    const mevcutSira = Math.max(-1, ...l.kariyerGecmis.map(g => rankSira(g.kariyer)));
    if (amareSira > mevcutSira) {
      const yeni = RANKS[amareSira];
      // idempotent kilit: bu terfi daha önce işlendiyse atla
      const kilitId = `${l.id}_${yeni.replace(/[^A-Z0-9]+/g, '_')}`;
      const kilit = await db.collection('rutbe_degisimleri').doc(kilitId).get();
      if (kilit.exists) continue;
      // kariyerGecmis'e ekle (aynı kariyer yoksa)
      if (!l.kariyerGecmis.some(g => rankSira(g.kariyer) === amareSira)) {
        await db.collection('konusmacilar').doc(l.id).update({
          kariyerGecmis: admin.firestore.FieldValue.arrayUnion({ kariyer: yeni, tarih: buAy }),
        });
      }
      await db.collection('rutbe_degisimleri').doc(kilitId).set({
        coreId: l.id, ad: l.ad, eski: mevcutSira >= 0 ? RANKS[mevcutSira] : null, yeni,
        tarih: buAy, ts: admin.firestore.FieldValue.serverTimestamp(), tur: 'terfi',
      });
      terfiler.push({ ad: l.ad, id: l.id, eski: mevcutSira >= 0 ? RANKS[mevcutSira] : '—', yeni });
    } else if (amareSira < mevcutSira) {
      // veriye dokunma — sadece bilgi
      dusmeler.push({ ad: l.ad, id: l.id, sistem: RANKS[mevcutSira], amare: RANKS[amareSira] });
    }
  }

  // 4) Kutlama maili (yalnız değişiklik varsa)
  if ((terfiler.length || dusmeler.length) && process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const hedef = process.env.RUTBE_BILDIRIM_EMAIL || 's.emretopcu@gmail.com';
    const site = 'https://egitimtakvimi.oneteamglobal.ai';
    const terfiHtml = terfiler.map(t => `
      <div style="background:#faf5ff;border:1px solid #e9d5ff;border-radius:12px;padding:14px;margin:8px 0">
        <div style="font-size:16px;font-weight:800;color:#581c87">🎉 ${t.ad}</div>
        <div style="color:#7c3aed;margin:4px 0">${t.eski} → <b>${t.yeni}</b></div>
        <a href="${site}/lider/${t.id}" style="display:inline-block;background:#f59e0b;color:#3b0764;font-weight:700;padding:8px 14px;border-radius:8px;text-decoration:none;margin-top:6px">Profili aç → Başarı kartını indir</a>
      </div>`).join('');
    const dusmeHtml = dusmeler.length ? `
      <p style="color:#9ca3af;font-size:12px;margin-top:16px">ℹ️ Bilgi (veriye dokunulmadı): ${dusmeler.map(d => `${d.ad} (sistem: ${d.sistem}, amare: ${d.amare})`).join(' · ')}</p>` : '';
    await resend.emails.send({
      from: 'One Team Eğitim <noreply@oneteamglobal.ai>',
      to: hedef,
      subject: terfiler.length ? `🎉 ${terfiler.length} yeni rütbe terfisi — kutlama kartları hazır` : 'Rütbe senkron bilgi notu',
      html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto">
        <h2 style="color:#581c87">Rütbe Senkronu</h2>
        ${terfiler.length ? `<p>Amare verisinde <b>${terfiler.length} terfi</b> algılandı; profiller otomatik güncellendi:</p>${terfiHtml}` : '<p>Terfi yok.</p>'}
        ${dusmeHtml}
        <p style="color:#9ca3af;font-size:11px;margin-top:20px">Bu mail günlük rütbe senkronundan otomatik gönderildi.</p>
      </div>`,
    });
  }

  return { statusCode: 200, body: JSON.stringify({ lider: liderler.length, eslesen: amareRank.size, terfi: terfiler.length, dusme: dusmeler.length }) };
};
