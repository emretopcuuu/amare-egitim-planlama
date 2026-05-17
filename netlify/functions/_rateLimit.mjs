// _rateLimit.mjs — Firestore-tabanlı IP rate limiter
// Public endpoint'leri abuse'a karşı korur. Sliding window count.
//
// Kullanım:
//   import { rateLimitCheck } from './_rateLimit.mjs';
//   const limit = await rateLimitCheck(req, 'dil-cevir', { perMinute: 30, perHour: 200 });
//   if (!limit.ok) return new Response(JSON.stringify({ error: 'Rate limit aşıldı', retryAfter: limit.retryAfter }), {
//     status: 429, headers: { 'Retry-After': String(limit.retryAfter), ... }
//   });

import admin from 'firebase-admin';
import { createHash } from 'crypto';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    }),
  });
}

function getClientIp(req) {
  // Netlify header'ları (production)
  const xff = req.headers.get('x-forwarded-for') || '';
  const nfIp = req.headers.get('x-nf-client-connection-ip') || '';
  const cfIp = req.headers.get('cf-connecting-ip') || '';
  const ip = nfIp || cfIp || (xff.split(',')[0] || '').trim() || 'unknown';
  return ip;
}

function hashIp(ip) {
  // Privacy: IP'yi hash'le, plain text saklama
  return createHash('sha256').update(`${ip}|amare-rl`).digest('hex').slice(0, 24);
}

/**
 * @param {Request} req — Netlify Function request
 * @param {string} endpoint — endpoint adı (örn 'dil-cevir')
 * @param {object} opts — { perMinute: 30, perHour: 200 }
 * @returns {{ ok: boolean, retryAfter: number, count: number }}
 */
export async function rateLimitCheck(req, endpoint, opts = {}) {
  const perMinute = opts.perMinute ?? 30;
  const perHour = opts.perHour ?? 200;
  const ip = getClientIp(req);
  const ipHash = hashIp(ip);
  const now = Date.now();
  const docId = `${endpoint}_${ipHash}`;
  const ref = admin.firestore().doc(`rate_limits/${docId}`);

  try {
    const snap = await ref.get();
    let data = snap.exists ? snap.data() : { dakikaSayac: 0, dakikaBas: now, saatSayac: 0, saatBas: now };

    // Sliding window reset
    if (now - data.dakikaBas > 60 * 1000) {
      data.dakikaSayac = 0;
      data.dakikaBas = now;
    }
    if (now - data.saatBas > 60 * 60 * 1000) {
      data.saatSayac = 0;
      data.saatBas = now;
    }

    // Limit kontrolü
    if (data.dakikaSayac >= perMinute) {
      const retry = Math.ceil((60 * 1000 - (now - data.dakikaBas)) / 1000);
      return { ok: false, retryAfter: retry, count: data.dakikaSayac, scope: 'minute' };
    }
    if (data.saatSayac >= perHour) {
      const retry = Math.ceil((60 * 60 * 1000 - (now - data.saatBas)) / 1000);
      return { ok: false, retryAfter: retry, count: data.saatSayac, scope: 'hour' };
    }

    // Increment + write
    data.dakikaSayac++;
    data.saatSayac++;
    data.sonIstek = now;
    await ref.set(data, { merge: true });

    return { ok: true, count: data.dakikaSayac, perMinute, perHour };
  } catch (e) {
    // Firestore down — fail open (kullanıcıyı engelleme)
    console.warn(`[rate-limit] ${endpoint}: ${e.message}`);
    return { ok: true, count: 0, perMinute, perHour, error: e.message };
  }
}

export function rateLimitResponse(limit, cors = {}) {
  return new Response(JSON.stringify({
    error: 'Çok fazla istek',
    detail: `Saniyede çok fazla istek attın. ${limit.retryAfter} sn sonra tekrar dene.`,
    retryAfter: limit.retryAfter,
  }), {
    status: 429,
    headers: {
      'Content-Type': 'application/json',
      'Retry-After': String(limit.retryAfter),
      ...cors,
    },
  });
}
