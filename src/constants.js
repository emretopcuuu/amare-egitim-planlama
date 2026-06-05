// 2026-06-05 audit (#2): Custom Claims migrasyonu — transition mode
// Yeni admin'ler için endpoint: /.netlify/functions/admin-claim-ata
// Mevcut 9 admin migration tamamlanana kadar buradaki liste de destekleniyor.
// Migration tamamlanınca bu dosya ya tamamen kaldırılacak veya boş kalacak.
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

export const isAdminEmail = (email) =>
  !!email && ADMIN_EMAILS.includes(String(email).toLowerCase().trim());

/**
 * 2026-06-05 audit (#2): Yeni admin tespiti — Custom Claim öncelikli.
 * Firebase user'in idTokenResult.claims.admin === true ise admin.
 * Yoksa eski email whitelist'e bak (migration uyumluluğu).
 *
 * @param {{email?: string, claims?: object}} userInfo
 *   - email: lowercase normalize edilmiş
 *   - claims: idTokenResult.claims (admin: true varsa)
 */
export const userIsAdmin = (userInfo) => {
  if (!userInfo) return false;
  if (userInfo.claims?.admin === true) return true;
  return isAdminEmail(userInfo.email);
};
