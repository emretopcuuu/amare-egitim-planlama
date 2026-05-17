// _adminEmails.mjs — Backend functions için tek admin email kaynağı
//
// SENKRON TUTULMASI GEREKEN YERLER (admin eklerken/silerken 3 yer):
//   1. netlify/functions/_adminEmails.mjs  ← BURASI (backend)
//   2. firestore.rules → isAdmin() listesi  (Firestore izinleri)
//   3. storage.rules → isAdmin() listesi    (Storage izinleri)
//   4. src/constants.js → ADMIN_EMAILS      (frontend admin check)
//
// Yeni admin eklerken: 4 dosyayı da güncelle. Refactor için Firebase Custom Claims
// kullanılabilir ama o ayrı bir migration projesi.

export const ADMIN_EMAILS = [
  's.emretopcu@gmail.com',
  'onlineakademin@gmail.com',
  'toygarsenelmis@gmail.com',
  'alper.kirbiyik@gmail.com',
  'vitamindestegi@gmail.com',
  'kmaziliguney@gmail.com',
  'ilknurakkas17@gmail.com',
  'giray70@gmail.com',
  'furkancite@gmail.com',
];

/**
 * Bir email admin mi?
 * @param {string} email
 * @returns {boolean}
 */
export function isAdminEmail(email) {
  if (!email || typeof email !== 'string') return false;
  return ADMIN_EMAILS.includes(email.toLowerCase().trim());
}

/**
 * Bir Firebase decoded token admin mi?
 * @param {{ email?: string }} decoded
 * @returns {boolean}
 */
export function isAdminToken(decoded) {
  return isAdminEmail(decoded?.email);
}
