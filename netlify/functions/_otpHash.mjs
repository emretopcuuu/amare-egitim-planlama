// netlify/functions/_otpHash.mjs
// ─────────────────────────────────────────────────────────────────────────
// OTP kodu için HMAC-SHA256 hash.
// Firestore'da plain text saklanmasın diye — DB ele geçirilirse aktif
// kodlar görünmez. Salt: OTP_HASH_SECRET env var (Netlify'da set).
// Fallback: deterministik string (rotate edilebilir).
// ─────────────────────────────────────────────────────────────────────────

import { createHmac } from 'node:crypto';

const SECRET = process.env.OTP_HASH_SECRET
  || 'amare-otp-fallback-v1-rotate-via-env-when-possible-2026-06';

/**
 * 6 haneli kodu hash'le.
 * Email salt olarak eklenir → aynı kod farklı email = farklı hash.
 * @param {string} kod - 6 haneli numerik kod
 * @param {string} email - lowercase normalize edilmiş email
 * @returns {string} hex hash (64 char)
 */
export function hashOtp(kod, email) {
  const normalize = (s) => String(s || '').trim().toLowerCase();
  return createHmac('sha256', SECRET)
    .update(`${normalize(kod)}::${normalize(email)}`)
    .digest('hex');
}

/**
 * Constant-time string karşılaştırma — timing attack engellemesi.
 */
export function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
