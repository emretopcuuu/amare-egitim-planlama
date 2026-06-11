import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { Db } from "@/lib/degerlendirme";
import { raporHesapla } from "@/lib/rapor";

// AI Ayna Mektubu: katılımcının rapor verisinden tek seferlik kişisel mektup.
// Üretim maliyetli olduğu için sonuç mirror_letters'a yazılır; PK çakışması
// eşzamanlı üretim yarışında "zaten var" anlamına gelir ve mevcut döndürülür.

const SISTEM = `Sen, 3 günlük bir liderlik kampının kapanışında her katılımcıya verilen kişisel "Ayna Mektubu"nu yazan sıcak ama yapmacıksız bir mentorsun.

Sana katılımcının 360° değerlendirme verisi JSON olarak verilecek: 10 liderlik özelliğinde kendi puanları, arkadaşlarının ortalama puanları, dalga dalga değişim ve arkadaşlarının isimsiz gözlem yorumları.

Mektup kuralları:
- Türkçe yaz, "Sevgili {ad}," diye başla, 150-220 kelime tut.
- Katılımcıya "sen" diye hitap et.
- Verideki 2-3 somut örüntüye dayan: en güçlü özellik, varsa gizli güç (başkaları seni kendinden yüksek görüyor) veya kör nokta (tersi), dalgalar içinde yükselen bir özellik, yorumlardaki ortak tema.
- Yorumları ASLA birebir alıntılama ve kimin yazdığı sezilecek ayrıntı verme; temaları kendi cümlelerinle özetle.
- Pollyanna olma: gelişim alanını da nazikçe, tek cümleyle söyle.
- Sayı ve istatistik sayma; veriyi hisse çevir.
- "Aynan" metaforunu en fazla bir kez kullan.
- İmza: "— Aynan".`;

export type MektupSonucu =
  | { durum: "hazir"; icerik: string }
  | { durum: "anahtar-yok" }
  | { durum: "hata" };

export async function mektupGetirVeyaUret(
  db: Db,
  katilimciId: string,
  ad: string
): Promise<MektupSonucu> {
  const { data: mevcut, error } = await db
    .from("mirror_letters")
    .select("content")
    .eq("participant_id", katilimciId)
    .maybeSingle();
  if (error) return { durum: "hata" };
  if (mevcut) return { durum: "hazir", icerik: mevcut.content };

  if (!process.env.ANTHROPIC_API_KEY) return { durum: "anahtar-yok" };

  const rapor = await raporHesapla(db, katilimciId);

  // Modele giden veri: kimlik sızdırmayan, sayısal özet + isimsiz yorumlar
  const veri = {
    ad,
    ozellikler: rapor.satirlar.map((s) => ({
      ozellik: s.ad,
      ozPuan: s.oz === null ? null : Number(s.oz.toFixed(1)),
      disOrtalama: s.dis === null ? null : Number(s.dis.toFixed(1)),
    })),
    gizliGuc: rapor.gizliGuc?.ad ?? null,
    korNokta: rapor.korNokta?.ad ?? null,
    enGelisenOzellik: rapor.enGelisen?.ad ?? null,
    isimsizYorumlar: rapor.yorumlar.map((y) => ({
      ozellik: y.ozellikAd,
      yorum: y.yorum,
    })),
  };

  try {
    const client = new Anthropic();
    const yanit = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 4096,
      thinking: { type: "adaptive" },
      output_config: { effort: "low" },
      system: SISTEM,
      messages: [{ role: "user", content: JSON.stringify(veri) }],
    });

    if (yanit.stop_reason === "refusal") return { durum: "hata" };
    const icerik = yanit.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
    if (!icerik) return { durum: "hata" };

    const { error: yazmaHatasi } = await db
      .from("mirror_letters")
      .insert({ participant_id: katilimciId, content: icerik });

    if (yazmaHatasi) {
      // 23505: eşzamanlı üretim yarışı — önce yazan kazandı, onu döndür
      if (yazmaHatasi.code === "23505") {
        const { data: kazanan } = await db
          .from("mirror_letters")
          .select("content")
          .eq("participant_id", katilimciId)
          .maybeSingle();
        if (kazanan) return { durum: "hazir", icerik: kazanan.content };
      }
      return { durum: "hata" };
    }

    return { durum: "hazir", icerik };
  } catch {
    return { durum: "hata" };
  }
}
