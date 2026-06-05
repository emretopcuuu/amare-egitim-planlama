// netlify/functions/_turnstileVerify.mjs
// ─────────────────────────────────────────────────────────────────────────
// Cloudflare Turnstile token doğrulama.
//
// Frontend Turnstile widget'i kullanıcıya çözdükten sonra body.cfToken
// ile token'i backend'e iletir. Burada Cloudflare API'sine soruyoruz.
//
// Behavior:
//   - TURNSTILE_SECRET env yoksa: PASS (kapalı mod, dev için)
//   - Env varsa: token zorunlu, geçersizse 401-equivalent dön
//   - Network/Cloudflare hatası: 503 (uçtan uca fail-open YOK, fail-closed)
// ─────────────────────────────────────────────────────────────────────────

const TURNSTILE_ENDPOINT = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/**
 * @param {string} token - Frontend widget'tan gelen cf-turnstile-response
 * @param {string} ip - rastgele rate-limit için (opsiyonel)
 * @returns {{ok:true, hata?:string} | {ok:false, hata:string, status:number}}
 */
export async function turnstileVerify(token, ip) {
  const secret = process.env.TURNSTILE_SECRET;
  if (!secret) {
    // Dev/local: bypass — production env'inde mutlaka set olmalı
    return { ok: true, hata: 'secret-yok-bypass' };
  }
  if (!token || typeof token !== 'string' || token.length < 10) {
    return { ok: false, hata: 'token-yok', status: 400 };
  }

  try {
    const form = new URLSearchParams();
    form.set('secret', secret);
    form.set('response', token);
    if (ip) form.set('remoteip', ip);

    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch(TURNSTILE_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
      signal: ctrl.signal,
    });
    clearTimeout(tid);

    const data = await res.json().catch(() => ({}));
    if (data?.success === true) return { ok: true };

    const codes = Array.isArray(data?.['error-codes']) ? data['error-codes'].join(',') : 'unknown';
    return { ok: false, hata: `turnstile:${codes}`, status: 401 };
  } catch (err) {
    return { ok: false, hata: `turnstile-network:${err.message?.slice(0, 60)}`, status: 503 };
  }
}
