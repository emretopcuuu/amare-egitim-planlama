import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { Db } from "@/lib/degerlendirme";
import { raporHesapla } from "@/lib/rapor";
import { pusulaCekirdek } from "@/lib/pusula";

// "SENİN İÇİN" KÖPRÜSÜ — kişinin uğruna savaştığı insan(lar)ı canlı tutar.
// AYNA, üç günde gösterdiklerini kişinin çekirdek nedenine (kim için?) bağlayan
// kısa, dokunaklı bir metin yazar. Kişi bunu sevdiğine gönderebilir — "neden"
// soyut kalmaz, ete kemiğe bürünür. Write-once (tek_cumle ile aynı desen).

const SISTEM = `Sen AYNA'sın — bu 3 günlük liderlik kampını yöneten, görev verip katılımcıları üç gün boyunca izleyen yapay zekâ. Ses tonun: sıcak, sakin, derinden gören; asla yargılamayan, asla abartmayan. ASLA gözetleme dili kullanma.

Şimdi en içten köprüyü kuruyorsun: "SENİN İÇİN". Kişinin kampa neden geldiğini (kimin için savaştığını — çekirdek nedeni) biliyorsun. Görevi: kişinin üç günde GERÇEKTEN gösterdiklerini, uğruna savaştığı o insana/nedene bağlayan kısa bir metin yaz. Kişi bu metni sevdiğine gösterebilsin/gönderebilsin.

Sana JSON verilecek: kişinin adı, çekirdek nedeni (genelde sevdiği biri ya da bir amaç), iç engeli, sloganı, kampta gösterdiği en güçlü yan, en çok gelişen yanı.

KURALLAR:
- Türkçe. 3-4 KISA cümle (en fazla ~55 kelime). Tek nefeste okunan, kalpten.
- Kişiye "sen" diye hitap et. Metin ona ait — ama uğruna savaştığı kişiyi/nedeni onurlandırsın.
- Çekirdek neden belirli bir insanı işaret ediyorsa (eş, çocuk, anne, baba...) ona zarif bir gönderme yap; belirsizse "sevdiklerin" gibi sıcak ve genel kal.
- Üç günde gösterdiği SOMUT bir gücü, o nedene köprüle: "bu kampta şunu gösterdin — işte tam da onlar için."
- Sonunda nazik bir davet: bu cümleyi/metni o kişiye göster ya da içinde sakla. Zorlama, yumuşacık.
- Klişe yok (kelebek, yolculuk, ışığını keşfet...). Bu kişiye özel, başkasına yazılamayacak bir metin olsun.
- Sayı/istatistik sayma. Duyguya çevir. İmza koyma (uygulama zaten AYNA imzasını gösterir).
- ÇIKTI: yalnızca metnin kendisi. Ön söz, başlık, tırnak, açıklama YOK.`;

export type SeninIcinSonuc =
  | { durum: "hazir"; metin: string }
  | { durum: "anahtar-yok" }
  | { durum: "hata" };

export async function seninIcinGetirVeyaUret(
  db: Db,
  katilimciId: string,
  ad: string
): Promise<SeninIcinSonuc> {
  // 1) Önbellek.
  const { data: mevcut } = await db
    .from("senin_icin")
    .select("metin")
    .eq("participant_id", katilimciId)
    .maybeSingle();
  if (mevcut?.metin) return { durum: "hazir", metin: mevcut.metin };

  if (!process.env.ANTHROPIC_API_KEY) return { durum: "anahtar-yok" };

  // 2) Veri.
  const [rapor, cekirdek] = await Promise.all([
    raporHesapla(db, katilimciId),
    pusulaCekirdek(db, katilimciId),
  ]);

  const { data: pus } = await db
    .from("pusula")
    .select("slogan")
    .eq("participant_id", katilimciId)
    .maybeSingle();

  const veri = {
    ad: ad.split(" ")[0],
    cekirdekNeden: cekirdek?.cekirdek_neden ?? null,
    icEngel: cekirdek?.ic_engel ?? null,
    slogan: pus?.slogan ?? null,
    enGuclu: rapor.guclu[0]?.ad ?? null,
    enGelisen: rapor.enGelisen?.ad ?? null,
  };

  // Çekirdek neden yoksa bu köprü anlamını yitirir — sessizce atla.
  if (!veri.cekirdekNeden || (Array.isArray(veri.cekirdekNeden) && veri.cekirdekNeden.length === 0)) {
    return { durum: "hata" };
  }

  // 3) Üret.
  let metin: string;
  try {
    const client = new Anthropic();
    const yanit = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 500,
      thinking: { type: "disabled" },
      output_config: { effort: "low" },
      system: SISTEM,
      messages: [{ role: "user", content: JSON.stringify(veri) }],
    });
    if (yanit.stop_reason === "refusal") return { durum: "hata" };
    metin = yanit.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { text: string }).text)
      .join("")
      .trim()
      .slice(0, 600);
    if (!metin) return { durum: "hata" };
  } catch {
    return { durum: "hata" };
  }

  // 4) Yaz (write-once; 23505 → mevcut kazanır).
  const { error } = await db
    .from("senin_icin")
    .insert({ participant_id: katilimciId, metin });
  if (error) {
    if (error.code === "23505") {
      const { data: kazanan } = await db
        .from("senin_icin")
        .select("metin")
        .eq("participant_id", katilimciId)
        .maybeSingle();
      if (kazanan?.metin) return { durum: "hazir", metin: kazanan.metin };
    }
    return { durum: "hata" };
  }
  return { durum: "hazir", metin };
}
