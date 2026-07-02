import "server-only";
import { clearSession } from "@/lib/auth/session";
import { tr } from "@/lib/i18n/tr";

// BAYAT OTURUM SAVUNMASI — Postgres 23503 = foreign key ihlali: oturumdaki
// participant_id artık participants tablosunda yok (ör. kamp sıfırlaması
// sonrası eski çerezle giren kişi). Bu durumda "tekrar dene" SONSUZA KADAR
// aynı şekilde başarısız olur; kişiye jenerik "Kaydedilemedi" göstermek onu
// kilitlenmiş bir döngüye sokar (bkz. on-farkındalık'ta yaşanan canlı vaka).
//
// Çözüm: çerezi temizle + net bir mesajla 409 dön. İstemci hata mesajını
// gösterir; çerez silindiği için bir sonraki gezinme /giris'e düşer ve kişi
// kodla girip kaldığı yerden devam eder.
export async function bayatOturumYaniti(
  error: { code?: string } | null | undefined
): Promise<Response | null> {
  if (error?.code !== "23503") return null;
  await clearSession();
  return Response.json(
    { hata: tr.onFarkindalik.oturumBayat, oturumBayat: true },
    { status: 409 }
  );
}
