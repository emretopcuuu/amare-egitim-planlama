// _clientIp.mjs — gerçek istemci IP'si (hız sınırı + Turnstile için)
//
// Site Cloudflare Pages'ten sunulduğunda /.netlify/functions/* istekleri Cloudflare
// üzerinden bu Netlify sitesine vekil (proxy) ile gelir. O durumda Netlify'ın
// x-nf-client-connection-ip başlığı Cloudflare'in çıkış IP'sini taşır — herkes aynı
// IP'den geliyor görünür, hız sınırı tüm kullanıcıları tek kovaya koyar.
// Vekil gerçek IP'yi x-ot-client-ip ile iletir; yalnız paylaşılan anahtar
// doğruysa güvenilir — aksi halde herkes başlığı uydurabilirdi.
//
// Anahtar YENİ bir ortam değişkeni DEĞİL: Netlify fonksiyon değişkenleri toplamı 4 KB'ı
// aşamaz (AWS Lambda sınırı; 22 Eyl'de ayrı CF_PROXY_KEY eklemek dağıtımı düşürdü).
// Bu yüzden mevcut OTP_HASH_SECRET'tan türetilir; Cloudflare tarafında aynı türetilmiş
// değer CF_PROXY_KEY sırrı olarak durur. OTP_HASH_SECRET değişirse CF sırrı da yenilenmeli
// (yenilenmezse yalnız gerçek-IP özelliği düşer, site çalışmaya devam eder).
import { createHmac, timingSafeEqual } from 'crypto';

function anahtarDogru(gelen) {
  const tohum = process.env.OTP_HASH_SECRET || '';
  const beklenen = tohum ? createHmac('sha256', tohum).update('ot-cf-proxy-v1').digest('hex') : '';
  if (!beklenen || !gelen) return false;
  const a = Buffer.from(String(gelen)), b = Buffer.from(beklenen);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function getClientIp(req) {
  const vekilIp = req.headers.get('x-ot-client-ip') || '';
  if (vekilIp && anahtarDogru(req.headers.get('x-ot-proxy-key'))) return vekilIp.trim();
  const xff = req.headers.get('x-forwarded-for') || '';
  const nfIp = req.headers.get('x-nf-client-connection-ip') || '';
  const cfIp = req.headers.get('cf-connecting-ip') || '';
  return nfIp || cfIp || (xff.split(',')[0] || '').trim() || '';
}
