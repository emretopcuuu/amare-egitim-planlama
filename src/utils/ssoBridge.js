// ssoBridge.js — egitimtakvimi (Firebase) -> ortak Supabase oturumu
// Gercek (anonim olmayan, email'li) kullanici Firebase ile girince:
//   1. Firebase ID token al
//   2. HBB /api/sso/supabase-session'a gonder (token KATI dogrulanir orada)
//   3. Donen token_hash ile verifyOtp -> oturumu .oneteamglobal.ai cookie'sine yaz
//   4. Artik HBB/90gun/CRM/Presidential da otomatik girisli (ortak cookie)
// Tum subdomain'lerle ayni Supabase projesi + ayni cookie anahtari (sb-<ref>-auth-token).

import { createClient } from '@supabase/supabase-js';

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
    if (!firebaseUser || firebaseUser.isAnonymous || !firebaseUser.email) return;
    if (getCookie(COOKIE_KEY)) { _bridged = true; return; } // zaten ortak oturum var

    const idToken = await firebaseUser.getIdToken();
    const r = await fetch(HBB_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });
    const j = await r.json();
    if (!j.ok || !j.token_hash) return;

    const sb = createClient(SUPA_URL, SUPA_ANON, {
      auth: { storage: ssoStorage, persistSession: true, autoRefreshToken: false },
    });
    // Surum farki: once 'email', olmazsa 'magiclink' tipiyle dene
    let res = await sb.auth.verifyOtp({ token_hash: j.token_hash, type: 'email' });
    if (res && res.error) {
      res = await sb.auth.verifyOtp({ token_hash: j.token_hash, type: 'magiclink' });
    }
    if (res && !res.error) _bridged = true;
    // basarili -> .oneteamglobal.ai cookie set; diger subdomain'ler otomatik girisli
  } catch (e) {
    console.warn('[sso-bridge]', e && e.message);
  }
}
