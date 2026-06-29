import "server-only";
import type { Db } from "@/lib/degerlendirme";

// Kampın 1. gününün Istanbul tarihi ("YYYY-MM-DD"). Tek doğruluk kaynağı
// `ayna_baslangic` ayarıdır: AYNA aktifleştirildiği (kampın "başlatıldığı") an
// yazılır, sıfırlamada silinir. Böylece kamp günleri (Gün 1/2/3) sabit bir
// takvime değil, kullanıcının başlattığı ana bağlanır.
//
// ayna_baslangic yoksa (kamp henüz başlatılmadıysa) undefined döner →
// kampGunu/kampGunleri sabit varsayılan takvime düşer (geriye dönük davranış).
export async function kampBaslangicGetir(db: Db): Promise<string | undefined> {
  const { data } = await db
    .from("settings")
    .select("value")
    .eq("key", "ayna_baslangic")
    .maybeSingle();
  if (!data?.value) return undefined;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(data.value));
}
