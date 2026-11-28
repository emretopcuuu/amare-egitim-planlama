// netlify/functions/_girisToken.mjs
// ─────────────────────────────────────────────────────────────────────────
// Giriş akışı için opak, sunucuda saklanan tek kullanımlık jetonlar (KVKK O8).
//
// Eskiden uye-giris-link telefon/Amare ID sorgusunda TAM email'i (emailReal)
// cevapta döndürüyordu → ID'yi bilen herkes kişinin email'ini öğreniyordu.
// Artık email sunucuda kalır; istemciye yalnız maskeli email + rastgele jeton
// gider. Jetonun yalnız SHA-256 hash'i giris_otp dokümanında saklanır.
//
// İki ayrı jeton var, bilerek:
//   - istemciJetonu: cevapta isteyene döner. Tek başına işe yaramaz; yalnız
//     mailde gelen 6 haneli kodla birlikte girişe çevrilir. Email'i AÇIĞA
//     ÇIKARMAZ.
//   - linkJetonu: YALNIZ maildeki giriş linkinin içinde (continueUrl ?gt=).
//     Sadece posta kutusunun sahibi görür; /giris-tamamla bunu email'e çevirir
//     (Firebase signInWithEmailLink email ister). İstemciye hiç dönmez.
//
// Gizli anahtar (env) gerekmez: jeton rastgele, doğrulama hash eşleşmesiyle
// sunucuda yapılır. 4KB env bütçesine dokunmaz.
// ─────────────────────────────────────────────────────────────────────────

import { createHash, randomBytes } from 'node:crypto';

// Giriş ekranı açık kalırken kod girmek için yeterli; kod 24 saat geçerli
// olsa da jeton daha kısa yaşar (sayfa yenilenirse zaten yeni istek gerekir).
export const ISTEMCI_JETON_SURE_MS = 2 * 60 * 60 * 1000; // 2 saat
// Firebase linki 1 saat geçerli; jeton biraz pay bırakır.
export const LINK_JETON_SURE_MS = 2 * 60 * 60 * 1000; // 2 saat

const JETON_DESENI = /^[A-Za-z0-9_-]{32}$/;

export function jetonUret() {
  return randomBytes(24).toString('base64url'); // 32 karakter
}

export function jetonGecerliBicim(jeton) {
  return typeof jeton === 'string' && JETON_DESENI.test(jeton);
}

export function jetonHash(jeton) {
  return createHash('sha256').update(String(jeton)).digest('hex');
}

// "ahmet@gmail.com" → "ah***@g***.com"
export function maskEmail(email) {
  if (!email || !email.includes('@')) return '***';
  const [local, domain] = email.split('@');
  const dotIdx = domain.lastIndexOf('.');
  const domainHead = dotIdx > 0 ? domain.slice(0, dotIdx) : domain;
  const tld = dotIdx > 0 ? domain.slice(dotIdx) : '';
  const lh = local.length;
  const localMasked = lh <= 2 ? (local[0] || '') + '*' : local.slice(0, Math.min(2, lh - 2)) + '***';
  const dh = domainHead.length;
  const domainMasked = dh <= 1 ? domainHead + '***' : domainHead[0] + '***';
  return `${localMasked}@${domainMasked}${tld}`;
}
