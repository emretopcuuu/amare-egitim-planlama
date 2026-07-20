import "server-only";
import Anthropic from "@anthropic-ai/sdk";

// TEK MERKEZÎ AI İSTEMCİSİ — tüm modüller bunu kullanır.
//
// SDK varsayılanı 10 dakika timeout + 2 retry'dır: yoğun anda (etkinlik-sonrası
// yanıt patlaması, mentorluk sabahı) upstream/ağ takılmasında TEK bir asılı çağrı
// tik'i ya da kullanıcının "Gönder" butonunu dakikalarca bekletir; bu sırada cron
// yeni tikler başlatır (overlap). 45 sn timeout + 1 retry: başarısız olan çağrı
// zaten null-dönüş / ŞABLON fallback yollarına giriyor (sistem bunun için
// tasarlandı) — sadece 10 dk yerine 45 sn'de o yola girer.
export function aynaClient(): Anthropic {
  return new Anthropic({ timeout: 45_000, maxRetries: 1 });
}
