// Admin yetkisine sahip Google hesapları (e-posta küçük harf).
// Buraya yeni admin eklemek için sadece bu dosyaya email satırı ekle + commit yeterli.
export const ADMIN_EMAILS = [
  's.emretopcu@gmail.com',
  'onlineakademin@gmail.com',
  'toygarsenelmis@gmail.com',
  'alper.kirbiyik@gmail.com',
  'vitamindestegi@gmail.com',
  'kmaziliguney@gmail.com',
];

export const isAdminEmail = (email) =>
  !!email && ADMIN_EMAILS.includes(String(email).toLowerCase().trim());
