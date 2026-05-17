// netlify/functions/uye-email-lookup.mjs
// ─────────────────────────────────────────────────────────────────────────
// GET /.netlify/functions/uye-email-lookup?uye=727614
//
// Magic link callback'te localStorage'da email yoksa
// (cross-device: email phone'da açılmış ama desktop'tan istemiş)
// kullanıcıya emailini hatırlatmak için maskeli email döner.
//
// Sadece amareId ile lookup yapar — email plain text döndürmez (privacy).
// Frontend "ahmet@gmail.com" yerine "ah***@g***.com" alır, kullanıcı emin olur.
// ─────────────────────────────────────────────────────────────────────────

import { rateLimitCheck, rateLimitResponse } from './_rateLimit.mjs';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function maskEmail(email) {
  if (!email || !email.includes('@')) return '***';
  const [local, domain] = email.split('@');
  const dotIdx = domain.lastIndexOf('.');
  const domainHead = dotIdx > 0 ? domain.slice(0, dotIdx) : domain;
  const tld = dotIdx > 0 ? domain.slice(dotIdx) : '';
  const lh = local.length;
  const localMasked = lh <= 2 ? local[0] + '*' : local.slice(0, Math.min(2, lh - 2)) + '***';
  const dh = domainHead.length;
  const domainMasked = dh <= 1 ? domainHead + '***' : domainHead[0] + '***';
  return `${localMasked}@${domainMasked}${tld}`;
}

async function supabaseGet(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}`);
  return res.json();
}

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

  try {
    // Rate limit: 20/dk, 100/sa per IP
    const limit = await rateLimitCheck(req, 'uye-email-lookup', { perMinute: 20, perHour: 100 });
    if (!limit.ok) return rateLimitResponse(limit, CORS);

    const url = new URL(req.url);
    const uyeId = url.searchParams.get('uye');
    if (!uyeId) {
      return new Response(JSON.stringify({ error: 'uye param gerekli' }), {
        status: 400, headers: { 'Content-Type': 'application/json', ...CORS },
      });
    }

    const rows = await supabaseGet(
      `amare_raw_members?select=amare_id,email&amare_id=eq.${encodeURIComponent(uyeId)}&limit=1`
    );
    if (!rows || rows.length === 0 || !rows[0].email) {
      return new Response(JSON.stringify({ emailMask: null, message: 'Email bulunamadı' }), {
        status: 200, headers: { 'Content-Type': 'application/json', ...CORS },
      });
    }

    return new Response(JSON.stringify({
      emailMask: maskEmail(rows[0].email),
      // Plain email döndürme — kullanıcı tahmin edip yazsın (security)
    }), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300', ...CORS } });

  } catch (err) {
    console.error('[uye-email-lookup] hata:', err.message);
    return new Response(JSON.stringify({ error: 'Sistem hatası', detail: err.message.slice(0, 200) }), {
      status: 500, headers: { 'Content-Type': 'application/json', ...CORS },
    });
  }
};
