// netlify/functions/egitmen-wa.mjs  (Auth: admin Bearer ID token)
// ─────────────────────────────────────────────────────────────────────────
//  POST { mode:'onizleme', egitmen, egitim, tarih, saat, konu }
//     → eğitmen isimlerini amare_raw_members ile eşleştir, ÖNİZLEME döner
//       (kim/eşleşen/maskeli telefon/güven). Mesaj GÖNDERMEZ.
//  POST { mode:'gonder', payload:{...}, onayli:[ad...] }
//     → oneteamai-automation 'egitmen-wa' workflow'unu repository_dispatch ile
//       tetikler (GERÇEK gönderim orada; opt-out/dedup/Twilio hepsi orada).
//
//  Telefon: Supabase amare_raw_members (ekibim.mjs ile aynı erişim).
//  Gönderim: WhatsApp altyapısı oneteamai'da kalır (taşınmaz) → sadece tetik.
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

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
const GH_TOKEN = process.env.GH_DISPATCH_TOKEN;
const GH_REPO = process.env.GH_DISPATCH_REPO || 'emretopcuuu/oneteamai-automation';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};
const jsonRes = (b, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json', ...CORS } });

// ── İsim normalizasyon (Türkçe + unvan) ──
const UNVAN = /\b(prof|doç|doc|dr|op|uzm|dyt|av|müh|muh|hemş|hem|sn)\b\.?/gi;
const fold = (s) => String(s || '').toLocaleLowerCase('tr')
  .replace(UNVAN, ' ').replace(/[ıİi̇]/g, 'i').replace(/ğ/g, 'g').replace(/ş/g, 's').replace(/ç/g, 'c').replace(/ö/g, 'o').replace(/ü/g, 'u')
  .replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ').trim();
const foldTokens = (s) => fold(s).split(' ').filter(t => t.length >= 2);
// ilike sorgusu için orijinal (Türkçe harf korunur) token'lar
const origTokens = (s) => String(s || '').replace(UNVAN, ' ').replace(/[^\p{L}\s]/gu, ' ').replace(/\s+/g, ' ').trim().split(' ').filter(t => t.length >= 2);

function splitEgitmen(egitmen) {
  if (Array.isArray(egitmen)) return egitmen;
  if (!egitmen) return [];
  return String(egitmen).normalize('NFC').replace(/[​-‍﻿]/g, '')
    .split(/[\/,&]|\s*-\s*(?=[A-ZÇĞİÖŞÜa-zçğışöşü.]*\s*[A-ZÇĞİÖŞÜ]|Prof\.|Doç\.|Uzm\.|Dr\.|Dyt\.|Op\.)/)
    .map(n => n.replace(/\s*söyleşi\s*/gi, '').replace(/\s+ile\.{0,3}\s*$/i, '').trim()).filter(Boolean);
}

const COUNTRY_CODE = { TR: '90', AT: '43', BE: '32', CZ: '420', DE: '49', FR: '33', IE: '353', LU: '352', NL: '31', RO: '40', ES: '34', CH: '41', GB: '44' };
function normalizePhone(raw, country) {
  if (!raw) return null;
  let d = String(raw).replace(/\D/g, '');
  if (!d || d === '0') return null;
  if (d.startsWith('00')) d = d.slice(2);
  const code = COUNTRY_CODE[country] || '90';
  if (d.startsWith(code) && d.length >= code.length + 7 && d.length <= code.length + 12) return d;
  if (d.startsWith('0')) d = d.slice(1);
  if (d.startsWith(code) && d.length >= code.length + 7) return d;
  return code + d;
}
const maskPhone = (d) => d ? (d.slice(0, 4) + '***' + d.slice(-2)) : '';

async function sbGet(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } });
  if (!res.ok) return [];
  return res.json().catch(() => []);
}

async function esles(ad) {
  const ftoks = foldTokens(ad);
  const otoks = origTokens(ad);
  if (!ftoks.length) return { ad, durum: 'eşleşme_yok' };
  const soyad = otoks[otoks.length - 1] || otoks[0];
  let cands = [];
  for (const t of [soyad, otoks[0]]) {
    if (!t || t.length < 3) continue;
    const enc = encodeURIComponent(`*${t}*`);
    const d = await sbGet(`amare_raw_members?full_name=ilike.${enc}&select=amare_id,full_name,phone,country&limit=60`);
    if (d.length) { cands = d; break; }
  }
  if (!cands.length) return { ad, durum: 'eşleşme_yok' };
  let best = null, bestScore = 0;
  for (const c of cands) {
    const ct = new Set(foldTokens(c.full_name));
    const overlap = ftoks.filter(t => ct.has(t)).length;
    if (overlap > bestScore) { bestScore = overlap; best = c; }
  }
  if (!best) return { ad, durum: 'eşleşme_yok' };
  const soyadFold = ftoks[ftoks.length - 1];
  const soyadTutuyor = foldTokens(best.full_name).includes(soyadFold);
  if (bestScore < 2 && !soyadTutuyor) return { ad, durum: 'eşleşme_yok' };
  const guven = (bestScore >= 2 && bestScore >= ftoks.length - 1) ? 'kesin' : 'olası';
  const digits = normalizePhone(best.phone, best.country);
  if (!digits) return { ad, eslesen: best.full_name, durum: 'telefon_yok', guven };
  return { ad, eslesen: best.full_name, guven, durum: 'hazır', telefon: maskPhone(digits) };
}

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'POST') return jsonRes({ error: 'POST only' }, 405);

  const auth = req.headers.get('authorization') || '';
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) return jsonRes({ error: 'Token gerekli' }, 401);
  let decoded;
  try { decoded = await admin.auth().verifyIdToken(m[1]); } catch { return jsonRes({ error: 'Geçersiz token' }, 401); }
  if (!isAdminToken(decoded)) return jsonRes({ error: 'Admin yetkisi yok' }, 403);

  let body;
  try { body = await req.json(); } catch { return jsonRes({ error: 'Geçersiz gövde' }, 400); }
  const mode = body.mode || 'onizleme';

  if (mode === 'onizleme') {
    if (!SUPABASE_URL || !SUPABASE_KEY) return jsonRes({ error: 'Supabase yapılandırması eksik' }, 500);
    const isimler = splitEgitmen(body.egitmen || body.egitmenler || '');
    if (!isimler.length) return jsonRes({ error: 'Eğitmen bulunamadı (egitmen alanı boş)' }, 400);
    const detay = [];
    for (const ad of isimler) { try { detay.push(await esles(ad)); } catch { detay.push({ ad, durum: 'eşleşme_yok' }); } }
    return jsonRes({
      egitim: body.egitim || '', tarih: body.tarih || '', saat: body.saat || '', konu: body.konu || '',
      toplam: isimler.length,
      hazir: detay.filter(d => d.durum === 'hazır').length,
      detay,
    });
  }

  if (mode === 'gonder') {
    if (!GH_TOKEN) return jsonRes({ error: 'Gönderim yapılandırması eksik: GH_DISPATCH_TOKEN tanımlı değil. (Self-serve gönderim için tek seferlik GitHub token gerekiyor.)' }, 503);
    const payload = body.payload || {};
    const onayli = Array.isArray(body.onayli) ? body.onayli : [];
    if (!onayli.length) return jsonRes({ error: 'Gönderilecek onaylı eğitmen seçilmedi' }, 400);
    const client_payload = { payload: JSON.stringify({ ...payload, onayli }), confirm: 'true' };
    const res = await fetch(`https://api.github.com/repos/${GH_REPO}/dispatches`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${GH_TOKEN}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_type: 'egitmen-wa', client_payload }),
    });
    if (res.status !== 204) {
      const t = await res.text().catch(() => '');
      return jsonRes({ error: `Gönderim tetiklenemedi (GitHub ${res.status})`, detay: t.slice(0, 200) }, 502);
    }
    return jsonRes({ ok: true, tetiklendi: onayli.length, mesaj: 'Gönderim başlatıldı. Teslimat birkaç dakika içinde tamamlanır.' });
  }

  return jsonRes({ error: 'Bilinmeyen mode' }, 400);
};
