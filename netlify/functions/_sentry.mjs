// netlify/functions/_sentry.mjs
// ─────────────────────────────────────────────────────────────────────────
// Netlify Function'lar için Sentry helper.
//
// SENTRY_DSN env yoksa: NO-OP. Var olunca init + sentryWrap kullanılır.
//
// PII redact: aynı pattern set'i frontend ile paylaşılır
// (email/telefon/amareId → [REDACTED]).
//
// Usage:
//   import { sentryWrap } from './_sentry.mjs';
//   export default sentryWrap(async (req) => { ... });
// ─────────────────────────────────────────────────────────────────────────

import * as Sentry from '@sentry/node';

const DSN = process.env.SENTRY_DSN_BACKEND || '';
let initEdildi = false;

const PII_PATTERNS = [
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
  /\b\+?\d{10,15}\b/g,
  /\b[A-Z]{2,4}-?\d{6,10}\b/g,
];

function redactPii(s) {
  if (typeof s !== 'string') return s;
  let out = s;
  for (const pat of PII_PATTERNS) out = out.replace(pat, '[REDACTED]');
  return out;
}

function redactEvent(event) {
  try {
    if (event.message) event.message = redactPii(event.message);
    if (event.request?.url) event.request.url = redactPii(event.request.url);
    if (event.request?.query_string) event.request.query_string = redactPii(event.request.query_string);
    if (event.exception?.values) {
      for (const ex of event.exception.values) {
        if (ex.value) ex.value = redactPii(ex.value);
      }
    }
    if (event.user) {
      delete event.user.email;
      delete event.user.ip_address;
    }
  } catch {}
  return event;
}

function initOnce() {
  if (initEdildi || !DSN) return;
  initEdildi = true;
  try {
    Sentry.init({
      dsn: DSN,
      environment: process.env.CONTEXT || 'production',
      release: process.env.COMMIT_REF?.slice(0, 7) || 'unknown',
      tracesSampleRate: 0.1,
      sendDefaultPii: false,
      beforeSend: redactEvent,
      ignoreErrors: [
        'AbortError',
        'NetworkError',
      ],
    });
  } catch (e) {
    // Sentry init başarısızsa fonksiyonu yine de çalıştır
    console.warn('[_sentry] init başarısız:', e.message);
  }
}

/**
 * Function handler'i sarmalar — fırlatılan hata Sentry'e gider, sonra yeniden fırlatılır.
 * @param {Function} handler - async (req) => Response
 */
export function sentryWrap(handler) {
  return async (req, ctx) => {
    initOnce();
    if (!DSN) return handler(req, ctx); // NO-OP yol
    try {
      return await handler(req, ctx);
    } catch (err) {
      try {
        Sentry.captureException(err, {
          tags: {
            functionPath: req?.url ? new URL(req.url).pathname : 'unknown',
            method: req?.method || 'unknown',
          },
        });
        await Sentry.flush(2000);
      } catch {}
      throw err;
    }
  };
}

export { Sentry };
