import "server-only";
import type { Db } from "@/lib/degerlendirme";

// #10 KAMP TAAHHÜT DEFTERİ — görev dönüşlerindeki somut iş taahhütlerini
// yapılandırılmış tutar. Görev-yanıt hot-path'inden yazılır (mevcut tema
// madenciliği AI çağrısına bindirildi, ek çağrı yok). Salt sunucu (deny-all).

export type TaahhutTur = "gorusme" | "arama" | "randevu" | "liste" | "kayit" | "diger";
const TURLER: TaahhutTur[] = ["gorusme", "arama", "randevu", "liste", "kayit", "diger"];

export type CikanTaahhut = { tur: string; sayi: number | null; ozet: string };

// AI'dan çıkan ham taahhüdü doğrula + kaydet. Geçersizse sessizce atlar.
export async function kampTaahhutYaz(
  db: Db,
  pid: string,
  missionId: string | null,
  t: CikanTaahhut | null | undefined
): Promise<void> {
  if (!t?.ozet?.trim()) return;
  const tur = TURLER.includes(t.tur as TaahhutTur) ? (t.tur as TaahhutTur) : "diger";
  const sayi =
    typeof t.sayi === "number" && Number.isFinite(t.sayi) && t.sayi > 0 && t.sayi < 1000
      ? Math.floor(t.sayi)
      : null;
  await db
    .from("kamp_taahhut")
    .insert({ participant_id: pid, mission_id: missionId, tur, sayi, ozet: t.ozet.trim().slice(0, 200) })
    .then(() => {}, () => {}); // hata yut (hot-path bloklamaz)
}

export type TaahhutOzet = {
  toplamKisi: number; // taahhüt veren kişi sayısı
  toplamTaahhut: number; // satır sayısı
  turBazli: Record<TaahhutTur, { adet: number; sayiToplam: number }>;
};

// Kamp geneli kolektif özet — /ekran ve admin için ("bu salon N görüşme sözü verdi").
export async function kampTaahhutOzeti(db: Db): Promise<TaahhutOzet> {
  const { data } = await db.from("kamp_taahhut").select("participant_id, tur, sayi");
  const satirlar = (data ?? []) as { participant_id: string; tur: string; sayi: number | null }[];
  const turBazli = Object.fromEntries(
    TURLER.map((t) => [t, { adet: 0, sayiToplam: 0 }])
  ) as Record<TaahhutTur, { adet: number; sayiToplam: number }>;
  const kisiler = new Set<string>();
  for (const s of satirlar) {
    kisiler.add(s.participant_id);
    const tur = TURLER.includes(s.tur as TaahhutTur) ? (s.tur as TaahhutTur) : "diger";
    turBazli[tur].adet++;
    turBazli[tur].sayiToplam += s.sayi ?? 0;
  }
  return { toplamKisi: kisiler.size, toplamTaahhut: satirlar.length, turBazli };
}

// Kişinin kendi taahhütleri — Gün 3 SÖZ'ü / 90-gün planı bunlara bağlanabilir.
export async function kampTaahhutleriGetir(
  db: Db,
  pid: string
): Promise<{ tur: string; sayi: number | null; ozet: string }[]> {
  const { data } = await db
    .from("kamp_taahhut")
    .select("tur, sayi, ozet")
    .eq("participant_id", pid)
    .order("created_at", { ascending: false })
    .limit(20);
  return (data ?? []) as { tur: string; sayi: number | null; ozet: string }[];
}
