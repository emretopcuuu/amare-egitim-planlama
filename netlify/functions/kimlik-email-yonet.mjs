// netlify/functions/kimlik-email-yonet.mjs   (Auth: admin Bearer ID token)
// ─────────────────────────────────────────────────────────────────────────
// Kimlik/Email yönetim konsolu — bir kişinin email'ini TÜM sistemlerde gör + düzelt.
//   POST { mode:'ara', amareId }
//     → amare_raw_members / crm_members / email_overrides'taki email'i döner (durumla).
//   POST { mode:'kaydet', amareId, yeniEmail }
//     → email_overrides'a KİLİTLER (scraper ezmesin) + amare_raw_members.email +
//       crm_members.email PATCH → tüm sistemlerde kalıcı düzeltme.
//
// Hepsi tek Supabase projesinde (yvpstkbwglefxukfpgyd). service-role, RLS bypass.
// email_overrides: scraper upsert sonrası amare_raw_members'a geri uygular (kalıcılık).
// ─────────────────────────────────────────────────────────────────────────
import admin from 'firebase-admin';
import { isAdminToken } from './_adminEmails.mjs';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    }),
  });
}

const SB_URL = process.env.SUPABASE_URL || 'https://yvpstkbwglefxukfpgyd.supabase.co';
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};
const jr = (b, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json', ...CORS } });
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const sbHeaders = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' };
async function sbGet(path) {
  const r = await fetch(`${SB_URL}/rest/v1/${path}`, { headers: sbHeaders });
  if (!r.ok) return [];
  return r.json().catch(() => []);
}
async function sbPatch(table, amareId, body) {
  const r = await fetch(`${SB_URL}/rest/v1/${table}?amare_id=eq.${encodeURIComponent(amareId)}`, {
    method: 'PATCH', headers: { ...sbHeaders, Prefer: 'return=representation' }, body: JSON.stringify(body),
  });
  const data = await r.json().catch(() => []);
  return { ok: r.ok, adet: Array.isArray(data) ? data.length : 0, status: r.status };
}
async function sbUpsert(table, body) {
  const r = await fetch(`${SB_URL}/rest/v1/${table}`, {
    method: 'POST', headers: { ...sbHeaders, Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(body),
  });
  return { ok: r.ok, status: r.status };
}

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'POST') return jr({ error: 'POST only' }, 405);

  const auth = req.headers.get('authorization') || '';
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) return jr({ error: 'Token gerekli' }, 401);
  let decoded;
  try { decoded = await admin.auth().verifyIdToken(m[1]); } catch { return jr({ error: 'Geçersiz token' }, 401); }
  if (!isAdminToken(decoded)) return jr({ error: 'Admin yetkisi yok' }, 403);
  if (!SB_KEY) return jr({ error: 'Supabase yapılandırması eksik' }, 500);

  let body;
  try { body = await req.json(); } catch { return jr({ error: 'Geçersiz gövde' }, 400); }
  const amareId = String(body.amareId || '').trim();
  if (!/^\d{4,12}$/.test(amareId)) return jr({ error: 'Geçerli bir Amare ID gir (rakam).' }, 400);

  if (body.mode === 'ara') {
    const [raw, crm, ov] = await Promise.all([
      sbGet(`amare_raw_members?amare_id=eq.${amareId}&select=amare_id,email,full_name&limit=1`),
      sbGet(`crm_members?amare_id=eq.${amareId}&select=amare_id,email,full_name&limit=1`),
      sbGet(`email_overrides?amare_id=eq.${amareId}&select=email,updated_at,duzelten&limit=1`),
    ]);
    const isim = raw[0]?.full_name || crm[0]?.full_name || '';
    if (!raw.length && !crm.length) return jr({ bulundu: false, amareId, isim: '', sistemler: [] });
    return jr({
      bulundu: true, amareId, isim,
      sistemler: [
        { anahtar: 'amare_raw_members', ad: 'Eğitim Takvimi / Giriş', email: raw[0]?.email || null, kayitVar: !!raw.length, resyncEzer: true },
        { anahtar: 'crm_members', ad: 'CRM · HBB · Vizyon', email: crm[0]?.email || null, kayitVar: !!crm.length, resyncEzer: false },
      ],
      kilit: ov[0] ? { email: ov[0].email, tarih: ov[0].updated_at, duzelten: ov[0].duzelten } : null,
    });
  }

  if (body.mode === 'kaydet') {
    const yeniEmail = String(body.yeniEmail || '').trim().toLowerCase();
    if (!EMAIL_RE.test(yeniEmail)) return jr({ error: 'Geçerli bir email gir.' }, 400);

    // mevcut değerler (eski_email + isim, audit için)
    const [raw, crm] = await Promise.all([
      sbGet(`amare_raw_members?amare_id=eq.${amareId}&select=email,full_name&limit=1`),
      sbGet(`crm_members?amare_id=eq.${amareId}&select=email&limit=1`),
    ]);
    if (!raw.length && !crm.length) return jr({ error: 'Bu Amare ID hiçbir tabloda bulunamadı.' }, 404);
    const eskiEmail = raw[0]?.email || crm[0]?.email || null;

    // 1) email_overrides KİLİT (scraper ezmesin) — kalıcılık anahtarı
    const ovRes = await sbUpsert('email_overrides', {
      amare_id: amareId, email: yeniEmail, eski_email: eskiEmail,
      duzelten: decoded.email || 'admin', kaynak: 'admin-kimlik-yonet', updated_at: new Date().toISOString(),
    });
    // 2) amare_raw_members.email (giriş)
    const rawRes = raw.length ? await sbPatch('amare_raw_members', amareId, { email: yeniEmail }) : { ok: true, adet: 0 };
    // 3) crm_members.email (CRM/HBB/Vizyon) — kayıt varsa
    const crmRes = crm.length ? await sbPatch('crm_members', amareId, { email: yeniEmail }) : { ok: true, adet: 0 };

    // audit (Firestore — mevcut audit deseni)
    try {
      await admin.firestore().collection('kimlik_email_log').add({
        amareId, eskiEmail, yeniEmail, duzelten: decoded.email || null,
        raw: rawRes.ok, crm: crmRes.ok, override: ovRes.ok,
        ts: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch {}

    const basarili = ovRes.ok && rawRes.ok && crmRes.ok;
    return jr({
      ok: basarili, amareId, yeniEmail, eskiEmail,
      sonuc: {
        kilit: ovRes.ok, 'Eğitim Takvimi': rawRes.ok ? (rawRes.adet ? 'güncellendi' : 'kayıt yok') : 'HATA',
        'CRM/HBB/Vizyon': crmRes.ok ? (crmRes.adet ? 'güncellendi' : 'kayıt yok') : 'HATA',
      },
      mesaj: basarili ? 'Tüm sistemlerde güncellendi + kilitlendi (re-sync ezmez).' : 'Bazı yazımlar başarısız — sonucu kontrol et.',
    }, basarili ? 200 : 207);
  }

  return jr({ error: 'Bilinmeyen mode' }, 400);
};
