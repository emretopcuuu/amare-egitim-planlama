// Giriş hız-sınırı KURALI — saf, server-only DEĞİL (simülasyon/test bunu import
// edebilsin diye lib/kariyer.ts deseni). DB erişimi lib/auth/rate-limit.ts'te.
//
// KAMP GERÇEĞİ: ~150 kişi tek paylaşımlı Wi-Fi (tek public NAT IP) ardından
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
// Per-IP tavanı 60→200: ~150 kişi tek IP'den elle kod yazarken 5 dk'lık pencerede
// toplu yanlış deneme 60'ı kolayca aşabiliyordu; o zaman tek harf hatası yapan
// masum kişi "çok fazla deneme" görüp KENDİ kodundan şüpheleniyordu. 200'de bol pay
// var, brute-force hâlâ anlamsız: 200 yanlış/5dk = ~2.400/saat per-IP; 1M kod
// uzayında ~154 geçerli kodu bulmanın beklentisi ~6.500 deneme → ~2,7 saat sabit
// tahmin, hem de kazanç bir katılımcının öz-değerlendirmesi (düşük değer).

export const PENCERE_DK = 5;
export const MAX_BASARISIZ_IP = 200;
export const MAX_BASARISIZ_GLOBAL = 2000;

// Saf karar: verilen pencere içindeki başarısız deneme sayıları limiti aştı mı?
export function limitAsildiMi(ipBasarisiz: number, globalBasarisiz: number): boolean {
  return ipBasarisiz >= MAX_BASARISIZ_IP || globalBasarisiz >= MAX_BASARISIZ_GLOBAL;
}
