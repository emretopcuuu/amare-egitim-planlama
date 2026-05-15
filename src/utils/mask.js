// PII maskeleme helper'ları — profil sayfasında sponsor telefonu gibi
// hassas verileri ekrana basmadan tel:/wa.me intent başlatmak için.

export function maskPhone(phone) {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length < 7) return phone;
  // Son 2 hane görünür, ortası maskeli, ilk 3 hane (alan kodu) görünür
  const head = digits.slice(0, digits.length > 10 ? digits.length - 7 : 3);
  const tail = digits.slice(-2);
  return `${head} *** ** ${tail}`;
}

export function maskEmail(email) {
  if (!email || !email.includes('@')) return '***';
  const [local, domain] = email.split('@');
  const dotIdx = domain.lastIndexOf('.');
  const domainHead = dotIdx > 0 ? domain.slice(0, dotIdx) : domain;
  const tld = dotIdx > 0 ? domain.slice(dotIdx) : '';
  const localMasked = local.length <= 2
    ? local[0] + '*'
    : local.slice(0, Math.min(2, local.length - 2)) + '***';
  const domainMasked = domainHead.length <= 1
    ? domainHead + '***'
    : domainHead[0] + '***';
  return `${localMasked}@${domainMasked}${tld}`;
}

// "+905331234567" veya "05331234567" → "+905331234567" (wa.me uyumlu)
export function normalizePhoneForWa(phone) {
  if (!phone) return '';
  let d = String(phone).replace(/\D/g, '');
  // Başında 90 yoksa ve 0 ile başlıyorsa Türkiye prefix ekle
  if (d.length === 11 && d[0] === '0') d = '90' + d.slice(1);
  else if (d.length === 10) d = '90' + d;
  return d;
}
