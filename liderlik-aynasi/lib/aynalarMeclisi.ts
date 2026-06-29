import "server-only";
import type { Db } from "@/lib/degerlendirme";

// AYNALAR MECLİSİ — kolektif bilgelik. Kapanışta kişiye, kendi persona hâlini
// paylaşan kohort arkadaşlarını gösterir: "Senin gibi N kişi bu yolu yürüdü."
// Hem eşsiz hem ait hissettirir. Kör nokta içeriği yok; yalnız persona dağılımı.
// Ucuz: tek participants sorgusu (kariyer_durumu).

type MeclisBilgi = { etiket: string; icgoru: string };

// Persona hâli → topluluk etiketi + o hâli paylaşanların ortak keşfi.
const MECLIS: Record<string, MeclisBilgi> = {
  gerileme: {
    etiket: "düşüşten dönen lider",
    icgoru: "Düşüşü bir kimlik değil, bir viraj olarak görmeyi öğrendiler.",
  },
  yukselis: {
    etiket: "yükselişteki lider",
    icgoru: "İvmeyi şansa değil, kurdukları sisteme bağlamayı seçtiler.",
  },
  test_edilmemis: {
    etiket: "ilk kez sınanan lider",
    icgoru: "Hazır olmayı beklemeden, sahada sınanmayı göze aldılar.",
  },
  duraksama: {
    etiket: "düzlüğü aşmaya çalışan lider",
    icgoru: "Sızıntıyı suçlu aramadan, merakla aramayı seçtiler.",
  },
};

export type AynalarMeclisi = {
  etiket: string;
  benzerSayi: number; // kendisi hariç aynı hâli paylaşan kişi sayısı
  icgoru: string;
};

export async function aynalarMeclisi(db: Db, pid: string): Promise<AynalarMeclisi | null> {
  const { data } = await db
    .from("participants")
    .select("id, kariyer_durumu")
    .eq("role", "participant");
  const kisiler = data ?? [];
  const ben = kisiler.find((k) => k.id === pid);
  const hal = ben?.kariyer_durumu;
  if (!hal || !MECLIS[hal]) return null;

  const benzerSayi = kisiler.filter((k) => k.id !== pid && k.kariyer_durumu === hal).length;
  if (benzerSayi < 1) return null; // yalnızsa "meclis" anlamını yitirir

  return { etiket: MECLIS[hal].etiket, benzerSayi, icgoru: MECLIS[hal].icgoru };
}
