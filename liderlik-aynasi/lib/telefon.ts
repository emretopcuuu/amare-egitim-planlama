// Telefon numarası normalizasyonu — tek doğruluk kaynağı.
// Katılımcı kaydının yapıldığı her yol (CSV import, tekli ekleme, düzenleme)
// numarayı buradan geçirir; böylece veritabanına yalnız E.164 (+90532…) yazılır.
// WhatsApp gönderimi de E.164 beklediği için yerel format (0532…) sessizce atlanır.
//
// Desteklenen girişler:
//   "0532 281 36 00" / "0532-281-3600" / "05322813600"  → +905322813600
//   "5322813600"                                          → +905322813600
//   "905322813600" / "00905322813600"                     → +905322813600
//   "+905322813600" / "+44 7700 900123"                   → korunur (geçerliyse)
// Geçerli E.164 üretilemezse null döner — çağıran kaydı reddeder.

export function telefonNormalize(ham: string | null | undefined): string | null {
  if (!ham) return null;

  // Görünür ayırıcıları temizle: boşluk, tire, parantez, nokta, tab
  let s = ham.trim().replace(/[\s\-().]/g, "");
  if (!s) return null;

  // Uluslararası 00 önekini +'a çevir
  if (s.startsWith("00")) s = "+" + s.slice(2);

  if (s.startsWith("+")) {
    const rakam = s.slice(1);
    return /^[1-9]\d{7,14}$/.test(rakam) ? "+" + rakam : null;
  }

  // Buradan sonrası yalnız rakam olmalı
  if (/\D/.test(s)) return null;

  // Türkiye yerel: 0 + 10 hane (0532…)
  if (/^0[1-9]\d{9}$/.test(s)) return "+90" + s.slice(1);
  // Ülke kodlu ama +'sız: 90 + 10 hane (90532…)
  if (/^90[1-9]\d{9}$/.test(s)) return "+" + s;
  // Çıplak 10 hane (532…)
  if (/^[1-9]\d{9}$/.test(s)) return "+90" + s;

  return null;
}

// Verilen değer boş mu, geçerli mi, yoksa bozuk mu? CSV import gibi toplu
// akışların satır bazında karar verebilmesi için ayrıştırılmış sonuç.
export function telefonAyikla(
  ham: string | null | undefined
): { durum: "bos" } | { durum: "gecerli"; numara: string } | { durum: "bozuk" } {
  const t = (ham ?? "").trim();
  if (!t) return { durum: "bos" };
  const n = telefonNormalize(t);
  return n ? { durum: "gecerli", numara: n } : { durum: "bozuk" };
}
