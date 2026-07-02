import "server-only";
import type { Db } from "@/lib/degerlendirme";
import { sozGetir } from "@/lib/soz";

// [5.3] CASCADE KİTİ — kişinin kendi sözünden + aksiyonlarından, kendi ekibine
// taşıyabileceği "kopyalanabilir" bir kit üretir. Amaç: liderin öğrendiğini
// aşağı aktarması (duplication). Tamamen kişinin kendi verisinden kurulur; LLM
// yok. Kişi kiti kopyalar / WhatsApp'tan paylaşır.

export type CascadeKiti = {
  hazir: boolean;
  metin: string; // paylaşılabilir kit metni
  adimlar: string[]; // 3 kopyalanabilir adım
};

export async function cascadeKiti(db: Db, pid: string, ad: string): Promise<CascadeKiti> {
  const soz = await sozGetir(db, pid);
  const adimlar = (soz?.aksiyonlar ?? []).map((a) => a.metin).filter(Boolean).slice(0, 3);

  if (adimlar.length === 0) {
    return { hazir: false, metin: "", adimlar: [] };
  }

  const isim = (ad ?? "").split(" ")[0] || "Bir lider";
  const satirlar = [
    `🔥 ${isim}'in kamp kiti — kendi ekibine taşı:`,
    "",
    "Bu, kampta öğrendiğim ve işe yarayan 3 adım. Sen de bir kişiye aynısını yaptır:",
    ...adimlar.map((a, i) => `${i + 1}. ${a}`),
    "",
    "Kural basit: önce sen yap, sonra bir kişiye yaptır. Kopyalanan liderlik büyür.",
  ];

  return { hazir: true, metin: satirlar.join("\n"), adimlar };
}
