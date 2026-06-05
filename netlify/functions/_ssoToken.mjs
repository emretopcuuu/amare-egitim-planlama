// netlify/functions/_ssoToken.mjs
// ─────────────────────────────────────────────────────────────────────────
// Asistan SSO için JWT-benzeri HMAC token üret/doğrula.
//
// Format:  base64url(payload).base64url(hmac)
// Payload: { email, exp, nonce, src }
//   - exp : unix epoch (saniye) — token geçerlilik sonu
//   - nonce: 16 byte rastgele hex — replay engeli (verify tarafında 1sa tutulur)
//   - src : kaynak rozeti, telemetri amaçlı ("egitim-takvimi" gibi)
//
// Güvenlik:
//   - HMAC-SHA256, secret 32-byte (env ASISTAN_SSO_SECRET)
//   - safeEqual ile constant-time compare
//   - exp < now() reddedilir
//   - nonce verify tarafında 1sa Firestore'da tutulur (replay attack engeli)
// ─────────────────────────────────────────────────────────────────────────

import { createHmac, randomBytes } from 'node:crypto';

const SECRET = process.env.ASISTAN_SSO_SECRET || '';

function b64urlEncode(buf) {
  return Buffer.from(buf).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64urlDecode(s) {
  const pad = '='.repeat((4 - (s.length % 4)) % 4);
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64');
}

function hmac(payloadStr) {
  return createHmac('sha256', SECRET).update(payloadStr).digest();
}

export function safeEqual(a, b) {
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) return false;
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a[i] ^ b[i];
  return result === 0;
}

/**
 * @param {string} email - lowercase normalize edilmiş email
 * @param {object} opts
 * @param {number} [opts.ttlSec=300]  - default 5dk
 * @param {string} [opts.src='egitim-takvimi']
 */
export function ssoTokenUret(email, opts = {}) {
  if (!SECRET) throw new Error('ASISTAN_SSO_SECRET ayarlı değil');
  const ttlSec = Math.max(30, Math.min(900, opts.ttlSec || 300));
  const payload = {
    email: String(email || '').trim().toLowerCase(),
    exp: Math.floor(Date.now() / 1000) + ttlSec,
    nonce: randomBytes(16).toString('hex'),
    src: opts.src || 'egitim-takvimi',
  };
  const payloadStr = JSON.stringify(payload);
  const payloadB64 = b64urlEncode(payloadStr);
  const sigB64 = b64urlEncode(hmac(payloadB64));
  return { token: `${payloadB64}.${sigB64}`, payload };
}

/**
 * @returns {{ok:true, payload}} | {ok:false, hata:string}
 */
export function ssoTokenCoz(token) {
  if (!SECRET) return { ok: false, hata: 'sso-secret-yok' };
  if (typeof token !== 'string' || !token.includes('.')) {
    return { ok: false, hata: 'token-format' };
  }
  const [payloadB64, sigB64] = token.split('.');
  if (!payloadB64 || !sigB64) return { ok: false, hata: 'token-format' };

  let gelenSig, beklenenSig;
  try {
    gelenSig = b64urlDecode(sigB64);
    beklenenSig = hmac(payloadB64);
  } catch {
    return { ok: false, hata: 'imza-decode' };
  }
  if (!safeEqual(gelenSig, beklenenSig)) {
    return { ok: false, hata: 'imza-uyumsuz' };
  }

  let payload;
  try {
    payload = JSON.parse(b64urlDecode(payloadB64).toString('utf8'));
  } catch {
    return { ok: false, hata: 'payload-parse' };
  }
  if (!payload?.email || !payload?.exp || !payload?.nonce) {
    return { ok: false, hata: 'payload-eksik' };
  }
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp < now) return { ok: false, hata: 'suresi-doldu' };
  if (payload.exp > now + 3600) return { ok: false, hata: 'exp-asiri' }; // 1sa üstü sahte

  return { ok: true, payload };
}
