// 2026-07-10: Custom Claims migrasyonu TAMAMLANDI (9/9 admin'de admin:true doğrulandı).
// Eski ADMIN_EMAILS whitelist'i KALDIRILDI — bundle'da phishing hedefi liste tutulmaz.
// Yeni admin ekleme: /.netlify/functions/admin-claim-ata → kişi re-login → claim token'a işler.
// Admin tespiti YALNIZCA Firebase Custom Claim (idTokenResult.claims.admin === true).
export const userIsAdmin = (userInfo) => userInfo?.claims?.admin === true;
