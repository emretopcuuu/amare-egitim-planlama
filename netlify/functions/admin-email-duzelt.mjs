// netlify/functions/admin-email-duzelt.mjs
// ─────────────────────────────────────────────────────────────────────────
// POST /.netlify/functions/admin-email-duzelt
//   Auth: admin Bearer token
//   Body: { talepId, aksiyon: 'onayla' | 'reddet' }
//
// Email düzeltme talebini admin onaylar veya reddeder.
// Onay → amare_raw_members.email Supabase'de update edilir (service_role).
// Red → durum sadece güncellenir.
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
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

    const body = await req.json();
    const talepId = String(body.talepId || '').trim();
    const aksiyon = String(body.aksiyon || '').trim();

    if (!talepId) return jsonRes({ error: 'talepId gerekli' }, 400);
    if (!['onayla', 'reddet'].includes(aksiyon)) {
      return jsonRes({ error: 'aksiyon "onayla" veya "reddet" olmalı' }, 400);
    }

    const talepRef = admin.firestore().doc(`email_duzeltme_talepleri/${talepId}`);
    const talepSnap = await talepRef.get();
    if (!talepSnap.exists) return jsonRes({ error: 'Talep bulunamadı' }, 404);
    const talep = talepSnap.data();
    if (talep.durum !== 'beklemede') {
      return jsonRes({ error: `Talep zaten ${talep.durum} durumunda` }, 400);
    }

    if (aksiyon === 'reddet') {
      await talepRef.update({
        durum: 'reddedildi',
        islemTarihi: admin.firestore.FieldValue.serverTimestamp(),
        islemYapan: decoded.email,
      });
      return jsonRes({ ok: true, durum: 'reddedildi' });
    }

    // ONAYLAMA: Supabase'i güncelle
    if (!SUPABASE_SERVICE_KEY) {
      return jsonRes({
        error: 'SUPABASE_SERVICE_ROLE_KEY environment variable eksik. Netlify > Site Settings > Environment Variables ekle.',
      }, 500);
    }

    // lookup amareId veya phone olabilir. amareId numerik string ise direkt kullan
    const lookup = String(talep.lookup || '').trim();
    let amareId = null;
    let updateField = null;

    if (/^\d{6,10}$/.test(lookup)) {
      // Amare ID format (6-10 rakam)
      amareId = lookup;
      updateField = `amare_id=eq.${amareId}`;
    } else if (/^\+?\d[\d\s-]{6,}\d$/.test(lookup)) {
      // Telefon format
      const phoneNorm = lookup.replace(/[\s-]/g, '');
      // Birden fazla format dene
      updateField = `phone=in.(${phoneNorm},${phoneNorm.replace(/^\+?90/, '0')},${phoneNorm.replace(/^0/, '+90')})`;
    } else {
      // Email lookup'i (eski/bozuk)
      updateField = `email=eq.${encodeURIComponent(lookup)}`;
    }

    // Supabase PATCH (service_role bypass RLS)
    const url = `${SUPABASE_URL}/rest/v1/amare_raw_members?${updateField}`;
    const patchRes = await fetch(url, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({ email: talep.yeniEmail }),
    });

    if (!patchRes.ok) {
      const err = await patchRes.text();
      throw new Error(`Supabase PATCH ${patchRes.status}: ${err.slice(0, 200)}`);
    }
    const guncellenenler = await patchRes.json();

    await talepRef.update({
      durum: 'onaylandi',
      islemTarihi: admin.firestore.FieldValue.serverTimestamp(),
      islemYapan: decoded.email,
      guncellenenKayitSayisi: guncellenenler.length,
      guncellenenAmareIds: guncellenenler.map(g => g.amare_id),
    });

    return jsonRes({
      ok: true,
      durum: 'onaylandi',
      guncellenenler: guncellenenler.length,
      detay: guncellenenler.map(g => ({ amare_id: g.amare_id, full_name: g.full_name, email: g.email })),
    });

  } catch (err) {
    console.error('[admin-email-duzelt] hata:', err.message);
    return jsonRes({ error: 'Sistem hatası', detail: err.message.slice(0, 200) }, 500);
  }
};
