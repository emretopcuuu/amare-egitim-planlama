// ssoBridge.js — egitimtakvimi (Firebase) -> ortak Supabase oturumu
// Gercek (anonim olmayan, email'li) kullanici Firebase ile girince:
//   1. Firebase ID token al
//   2. HBB /api/sso/supabase-session'a gonder (token KATI dogrulanir orada)
//   3. Donen token_hash ile verifyOtp -> oturumu .oneteamglobal.ai cookie'sine yaz
//   4. Artik HBB/90gun/CRM/Presidential da otomatik girisli (ortak cookie)
// Tum subdomain'lerle ayni Supabase projesi + ayni cookie anahtari (sb-<ref>-auth-token).

import { createClient } from '@supabase/supabase-js';
import { Sentry } from './sentry';

// 2026-06-10: Köprü sessizce fail ediyordu (kör uçuş). Her adımı Sentry'e logla
// — sahada "ayrı giriş" şikayeti gelmeden hangi adımda kırıldığını görelim.
function ssoLog(adim, detay) {
  try {
    Sentry.addBreadcrumb({ category: 'sso-bridge', level: 'info', message: adim, data: detay || {} });
  } catch {}
  try { console.warn('[sso-bridge]', adim, detay || ''); } catch {}
}
function ssoHata(adim, detay) {
  try {
    Sentry.captureMessage(`SSO köprü fail: ${adim}`, { level: 'warning', extra: detay || {} });
  } catch {}
  try { console.warn('[sso-bridge] FAIL:', adim, detay || ''); } catch {}
}

const SUPA_URL = 'https://yvpstkbwglefxukfpgyd.supabase.co';
// Public anon key (RLS ile korunur — istemci tarafinda guvenli)
const SUPA_ANON =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2cHN0a2J3Z2xlZnh1a2ZwZ3lkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyMDI1MzQsImV4cCI6MjA5MDc3ODUzNH0.m083XesKYEHmphULxcnvgyLplOdQjvpPja5acy64p70';
const HBB_ENDPOINT = 'https://hbb.oneteamglobal.ai/api/sso/supabase-session';
const COOKIE_DOMAIN = '.oneteamglobal.ai';
const COOKIE_KEY = 'sb-yvpstkbwglefxukfpgyd-auth-token';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 gun

function getCookie(k) {
  try {
    const e = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const m = document.cookie.match(new RegExp('(?:^|; )' + e + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : null;
  } catch {
    return null;
  }
}
function setCookie(k, v) {
  try {
    document.cookie = `${k}=${encodeURIComponent(v)}; path=/; domain=${COOKIE_DOMAIN}; max-age=${COOKIE_MAX_AGE}; samesite=lax; secure`;
  } catch {
    /* ignore */
  }
}
function delCookie(k) {
  try {
    document.cookie = `${k}=; path=/; domain=${COOKIE_DOMAIN}; max-age=0; samesite=lax; secure`;
  } catch {
    /* ignore */
  }
}
// Diger uygulamalarla birebir ayni adaptor (cookie-oncelikli + localStorage migrasyon).
const ssoStorage = {
  getItem: (k) => {
    const c = getCookie(k);
    if (c) return c;
    try {
      const l = localStorage.getItem(k);
      if (l) {
        setCookie(k, l);
        return l;
      }
    } catch {
      /* ignore */
    }
    return null;
  },
  setItem: (k, v) => setCookie(k, v),
  removeItem: (k) => {
    delCookie(k);
    try {
      localStorage.removeItem(k);
    } catch {
      /* ignore */
    }
  },
};

let _bridged = false;

export async function bridgeToSupabase(firebaseUser) {
  try {
    if (_bridged) return;
    if (!firebaseUser || firebaseUser.isAnonymous || !firebaseUser.email) {
      ssoLog('atlandı: anonim/email-yok'); return;
    }
    if (getCookie(COOKIE_KEY)) { _bridged = true; ssoLog('zaten-oturum-var'); return; } // ortak oturum mevcut

    ssoLog('başladı', { email: firebaseUser.email });
    const idToken = await firebaseUser.getIdToken();
    const r = await fetch(HBB_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // server-set cookie'yi sakla — iOS WebKit JS cookie'yi paylaşmıyor
      body: JSON.stringify({ idToken }),
    });
    const j = await r.json().catch(() => ({}));
    if (!j.ok) {
      ssoHata('hbb-endpoint', { status: r.status, error: j.error || 'ok değil' });
      return;
    }

    // iOS dahil: server Set-Cookie ile ortak oturum zaten yazıldıysa bittik (client verifyOtp gereksiz).
    if (getCookie(COOKIE_KEY)) {
      _bridged = true;
      ssoLog('başarılı-server-cookie', { cookie_set: !!j.cookie_set });
      return;
    }

    // Fallback (masaüstü/Android eski yol, ya da server cookie yazılmadıysa): client verifyOtp
    if (!j.token_hash) {
      ssoHata('token_hash-yok-cookie-de-yok', { cookie_set: !!j.cookie_set });
      return;
    }
    ssoLog('token_hash-alındı (fallback)');

    const sb = createClient(SUPA_URL, SUPA_ANON, {
      auth: { storage: ssoStorage, persistSession: true, autoRefreshToken: false },
    });
    // Surum farki: once 'email', olmazsa 'magiclink' tipiyle dene
    let res = await sb.auth.verifyOtp({ token_hash: j.token_hash, type: 'email' });
    if (res && res.error) {
      ssoLog('verifyOtp-email-fail, magiclink deneniyor', { error: res.error.message });
      res = await sb.auth.verifyOtp({ token_hash: j.token_hash, type: 'magiclink' });
    }
    if (res && !res.error) {
      _bridged = true;
      // Doğrulama: cookie gerçekten yazıldı mı?
      const cookieYazildi = !!getCookie(COOKIE_KEY);
      ssoLog('başarılı', { cookieYazildi });
      if (!cookieYazildi) {
        ssoHata('cookie-yazilmadi', { not: 'verifyOtp OK ama .oneteamglobal.ai çerezi yok — Safari ITP / samesite olabilir' });
      }
    } else {
      ssoHata('verifyOtp', { error: res && res.error && res.error.message });
    }
    // basarili -> .oneteamglobal.ai cookie set; diger subdomain'ler otomatik girisli
  } catch (e) {
    ssoHata('exception', { message: e && e.message });
  }
}
