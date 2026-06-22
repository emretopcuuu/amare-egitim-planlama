// Giriş hız-sınırı KURALI — saf, server-only DEĞİL (simülasyon/test bunu import
// edebilsin diye lib/kariyer.ts deseni). DB erişimi lib/auth/rate-limit.ts'te.
//
// KAMP GERÇEĞİ: ~100 kişi tek paylaşımlı Wi-Fi (tek public NAT IP) ardından
// girer. Giriş kodları QR'dan otomatik dolar → çoğu giriş DOĞRU koddur (başarı,
// sayılmaz). Yine de elle giren birkaç kişi kodu yanlış yazarsa, per-IP başarısız
// sayacı hızla dolup AYNI IP'deki herkesi (doğru kod girenleri bile) kilitlerdi.
//
// İki katmanlı koruma:
//  1) giris route'u DOĞRU kodu her zaman geçirir — hız-sınırı yalnız YANLIŞ
//     denemeyi 429'lar (brute-force tahmini). Meşru kullanıcı asla kilitlenmez.
//  2) Eşikler kamp NAT'ına toleranslı: kısa pencere (hızlı toparlanma) + yüksek
//     per-IP başarısızlık tavanı; eski "global 100 başarısızlık = HERKES kilitli"
//     felaketi yüksek bir DoS tavanına çıkarıldı (kamp kendini kilitlemez).
//
// Brute-force matematiği: 60 yanlış/5dk = ~720/saat per-IP. 1M kodluk uzayda
// ~100 geçerli kodu bulmanın beklentisi ~10.000 deneme → ~14 saat sabit tahmin;
// pratikte anlamsız. Meşru kamp kullanımı bu eşiğin çok altında kalır.

export const PENCERE_DK = 5;
export const MAX_BASARISIZ_IP = 60;
export const MAX_BASARISIZ_GLOBAL = 2000;

// Saf karar: verilen pencere içindeki başarısız deneme sayıları limiti aştı mı?
export function limitAsildiMi(ipBasarisiz: number, globalBasarisiz: number): boolean {
  return ipBasarisiz >= MAX_BASARISIZ_IP || globalBasarisiz >= MAX_BASARISIZ_GLOBAL;
}
