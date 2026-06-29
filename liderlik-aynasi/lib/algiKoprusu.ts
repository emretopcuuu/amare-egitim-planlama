import "server-only";
import type { Db } from "@/lib/degerlendirme";
import { tumKayitlar } from "@/lib/tumKayitlar";

// ALGI KÖPRÜSÜ — "Canlı Kör-Nokta Deneyi"nin FİNALİ KORUYAN sürümü.
// Kamp boyunca AYNA'nın yürüttüğü deneyi CANLI hissettirir ama kör noktanın
// İÇERİĞİNİ (hangi özellik / puanlar) ASLA açmaz — o, Gün 3 "Ayna" anına saklı.
// Yalnızca soyut ilerleme döner: kaç kişi gözlemledi, kaç dalga toplandı, kaç
// görevle "kas çalıştırıldı" → "köprü kuruluyor, Gün 3'te tam açılacak" merakı.
//
// Spoiler güvenliği: hiçbir özellik adı, hiçbir puan, öz-vs-dış farkının yönü
// DIŞARI VERİLMEZ. Sadece hacim + ilerleme.

export type AlgiKoprusu = {
  gozlemSayisi: number; // kaç farklı kişi gözlemledi (others, gizli hariç)
  dalgaSayisi: number; // kaç dalgada gözlem toplandı (1-3)
  gorevSayisi: number; // kaç görev puanlandı ("kas çalıştırma")
  yuzde: number; // soyut "köprü kuruldu" ilerlemesi (dalga ilerlemesine bağlı)
};

export async function algiKoprusu(db: Db, pid: string): Promise<AlgiKoprusu | null> {
  const [disPuanlar, { count: gorevSayisi }] = await Promise.all([
    // Başkalarının (gizli olmayan) gözlemleri — yalnız rater + dalga (içerik yok).
    tumKayitlar<{ rater_id: string; wave: number }>((bas, son) =>
      db
        .from("ratings")
        .select("rater_id, wave")
        .eq("target_id", pid)
        .eq("is_self", false)
        .eq("is_hidden", false)
        .order("rater_id")
        .range(bas, son)
    ),
    db
      .from("missions")
      .select("id", { count: "exact", head: true })
      .eq("participant_id", pid)
      .eq("status", "scored"),
  ]);

  const gozlemSayisi = new Set(disPuanlar.map((r) => r.rater_id)).size;
  if (gozlemSayisi === 0) return null; // henüz veri yok — boş kart gösterme

  const dalgaSayisi = new Set(disPuanlar.map((r) => r.wave)).size;
  // Köprü ilerlemesi yalnız dalga sayısına bağlı (içerikten bağımsız, hep pozitif):
  // 1 dalga → %34, 2 → %67, 3 → %100. Finalde "tam açılır" beklentisi kurar.
  const yuzde = Math.min(100, Math.round((dalgaSayisi / 3) * 100));

  return { gozlemSayisi, dalgaSayisi, gorevSayisi: gorevSayisi ?? 0, yuzde };
}
