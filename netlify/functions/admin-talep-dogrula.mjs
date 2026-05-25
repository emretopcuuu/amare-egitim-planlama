// netlify/functions/admin-talep-dogrula.mjs
// ─────────────────────────────────────────────────────────────────────────
// POST /.netlify/functions/admin-talep-dogrula
//   Auth: admin Bearer token
//   Body: { lookups: [{ id, lookup, telefon? }, ...] }
//
// Email düzeltme taleplerindeki lookup'ları Supabase amare_raw_members'tan
// doğrular. Her talep için:
//   - Tip (amareId / phone / email) tespit
//   - Supabase'de paralel arama
//   - Eşleşen kayıt varsa: ad, amare_id, email, phone bilgisi dön
//
// Response: { results: [{ id, lookup, tip, bulundu, ad, amareId, email, phone }] }
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

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://yvpstkbwglefxukfpgyd.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function jsonRes(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

// Tip tespit
function detectType(lookup) {
  const v = String(lookup || '').trim();
  if (!v) return 'unknown';
  if (v.includes('@')) return 'email';
  if (/^\d{6,10}$/.test(v)) return 'amareId';
  if (/^[+\d\s-]{7,}$/.test(v)) return 'phone';
  return 'unknown';
}

// Telefon normalize (Türkiye)
function normalizePhone(p) {
  return String(p || '').replace(/[\s-]/g, '').replace(/^\+?90/, '').replace(/^0/, '');
}

// Supabase'de IN sorgu
async function supaIn(field, values) {
  if (!values.length || !SUPABASE_KEY) return [];
  // Tekrarsız yap
  const uniq = [...new Set(values.filter(Boolean))];
  if (uniq.length === 0) return [];
  // Postgres IN syntax: in.("v1","v2")
  const inClause = uniq.map(v => `"${String(v).replace(/"/g, '\\"')}"`).join(',');
  const url = `${SUPABASE_URL}/rest/v1/amare_raw_members?select=amare_id,full_name,email,phone&${field}=in.(${inClause})&limit=500`;
  try {
    const res = await fetch(url, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    });
    if (!res.ok) {
      console.warn(`[dogrula] Supabase ${field} ${res.status}`);
      return [];
    }
    return res.json();
  } catch (e) {
    console.warn(`[dogrula] Supabase ${field} hata: ${e.message}`);
    return [];
  }
}

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'POST') return jsonRes({ error: 'POST only' }, 405);

  try {
    // Admin auth
    const auth = req.headers.get('authorization') || '';
    const m = auth.match(/^Bearer\s+(.+)$/i);
    if (!m) return jsonRes({ error: 'Token gerekli' }, 401);
    let decoded;
    try { decoded = await admin.auth().verifyIdToken(m[1]); }
    catch { return jsonRes({ error: 'Geçersiz token' }, 401); }
    if (!isAdminToken(decoded)) return jsonRes({ error: 'Admin yetkisi yok' }, 403);

    if (!SUPABASE_KEY) {
      return jsonRes({ error: 'SUPABASE_SERVICE_ROLE_KEY eksik' }, 500);
    }

    const body = await req.json();
    const lookups = Array.isArray(body.lookups) ? body.lookups : [];
    if (lookups.length === 0) return jsonRes({ results: [] });

    // Type tespit + gruplama
    const amareIds = [];
    const phonesRaw = []; // ham telefon arama için
    const phonesNorm = []; // normalize edilmiş eşleşme için
    const emails = [];

    for (const l of lookups) {
      const t = detectType(l.lookup);
      if (t === 'amareId') {
        amareIds.push(l.lookup);
      } else if (t === 'phone') {
        // Supabase'de phone formatı bilinmiyor — birden fazla format ile sorgula
        const norm = normalizePhone(l.lookup);
        phonesNorm.push(norm);
        // Çoklu format dene
        phonesRaw.push(l.lookup);                       // orijinal
        phonesRaw.push(norm);                            // 5XX...
        phonesRaw.push('0' + norm);                      // 05XX...
        phonesRaw.push('+90' + norm);                    // +905XX...
        phonesRaw.push('90' + norm);                     // 905XX...
      } else if (t === 'email') {
        emails.push(String(l.lookup).toLowerCase().trim());
      }
      // Ek telefon alanı da var mı? talep.telefon — onu da ekleyim
      if (l.telefon && detectType(l.telefon) === 'phone') {
        const n = normalizePhone(l.telefon);
        phonesNorm.push(n);
        phonesRaw.push(l.telefon, n, '0' + n, '+90' + n, '90' + n);
      }
    }

    // Paralel Supabase sorguları
    const [amareResults, phoneResults, emailResults] = await Promise.all([
      supaIn('amare_id', amareIds),
      supaIn('phone', phonesRaw),
      supaIn('email', emails),
    ]);

    // Lookup → bulunan kayıt eşle
    const results = lookups.map(l => {
      const t = detectType(l.lookup);
      let found = null;

      if (t === 'amareId') {
        found = amareResults.find(r => String(r.amare_id) === String(l.lookup));
      } else if (t === 'phone') {
        const normLookup = normalizePhone(l.lookup);
        found = phoneResults.find(r => normalizePhone(r.phone) === normLookup);
      } else if (t === 'email') {
        const lowLookup = String(l.lookup).toLowerCase().trim();
        found = emailResults.find(r => String(r.email || '').toLowerCase().trim() === lowLookup);
      }

      // Ek telefon alanı ile de bulmaya çalış
      if (!found && l.telefon) {
        const normTel = normalizePhone(l.telefon);
        found = phoneResults.find(r => normalizePhone(r.phone) === normTel);
      }

      return {
        id: l.id,
        lookup: l.lookup,
        tip: t,
        bulundu: !!found,
        ad: found?.full_name || null,
        amareId: found?.amare_id || null,
        email: found?.email || null,
        phone: found?.phone || null,
      };
    });

    return jsonRes({ results });
  } catch (err) {
    console.error('[admin-talep-dogrula] hata:', err.message);
    return jsonRes({ error: 'Sistem hatası', detail: err.message.slice(0, 200) }, 500);
  }
};
