import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { Db } from "@/lib/degerlendirme";

// FAZ 4.3 — TAHMİN-GERÇEK SAPMASI. Kişinin "tahmin" görevine verdiği serbest
// metin yanıtı ile kampta biriken GERÇEK dış puan profili karşılaştırılır.
// Belirgin bir sapma varsa (tahmini yanıldıysa) merak uyandıran, içeriği
// açık etmeyen bir görev üretilir: "Tahminin şaşmak üzere — bugün üç kişiye
// sor: 'Bende ilk ne dikkatini çekti?'"
const SEMA = {
  type: "object" as const,
  properties: {
    sapmaVar: {
      type: "boolean" as const,
      description: "Kişinin tahmini, gerçek dış puan profiliyle BELİRGİN şekilde çelişiyor mu?",
    },
    baslik: { type: "string" as const, description: "Görevin kısa başlığı (en fazla 6 kelime). sapmaVar false ise boş string." },
    govde: {
      type: "string" as const,
      description:
        "sapmaVar true ise: kişiye tahmininin şaşmak üzere olduğunu hisSETTİR ama NE olduğunu asla söyleme; bugün 2-3 kişiye 'Bende ilk ne dikkatini çekti?' benzeri bir soru sormasını iste, cevaplardan çıkardığı ortak temayı sana yazmasını söyle. AYNA'nın ağzından, 3-4 cümle. sapmaVar false ise boş string.",
    },
  },
  required: ["sapmaVar", "baslik", "govde"],
  additionalProperties: false,
};

export type TahminSapmasiGorev = { title: string; body: string };

export async function tahminSapmasiGorevUret(
  db: Db,
  kisi: { id: string; full_name: string }
): Promise<TahminSapmasiGorev | null> {
  const { data: tahminGorevi } = await db
    .from("missions")
    .select("response_text")
    .eq("participant_id", kisi.id)
    .eq("kind", "tahmin")
    .eq("status", "scored")
    .not("response_text", "is", null)
    .order("scored_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!tahminGorevi?.response_text) return null;

  const { data: disPuanlar } = await db
    .from("ratings")
    .select("trait_id, score")
    .eq("target_id", kisi.id)
    .eq("is_self", false);
  if (!disPuanlar || disPuanlar.length < 3) return null;

  const toplamlar = new Map<number, { t: number; n: number }>();
  for (const p of disPuanlar) {
    const e = toplamlar.get(p.trait_id) ?? { t: 0, n: 0 };
    e.t += p.score;
    e.n += 1;
    toplamlar.set(p.trait_id, e);
  }
  if (toplamlar.size < 2) return null;

  const traitIdler = [...toplamlar.keys()];
  const { data: traitlerHam } = await db.from("traits").select("id, name").in("id", traitIdler);
  const traitAd = new Map((traitlerHam ?? []).map((t) => [t.id, t.name]));
  const profil = [...toplamlar.entries()]
    .map(([id, e]) => ({ ad: traitAd.get(id) ?? "—", ortalama: Number((e.t / e.n).toFixed(1)) }))
    .sort((a, b) => b.ortalama - a.ortalama);

  try {
    const client = new Anthropic();
    const yanit = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 400,
      thinking: { type: "disabled" },
      output_config: { format: { type: "json_schema", schema: SEMA } },
      system:
        "Bir liderlik kampı katılımcısının 'tahmin' görevine yazdığı serbest metni, kampta biriken GERÇEK dış puan profiliyle karşılaştır. Kişi kendi hakkında bir öngörüde bulunmuştu (hangi özellikte güçlü/zayıf görüneceği gibi); bu öngörü gerçek profille BELİRGİN şekilde çelişiyorsa sapmaVar=true yap ve merak uyandıran bir görev yaz — ama SONUCU asla açık etme, yalnız 'şaşıracaksın' hissi ver.",
      messages: [
        {
          role: "user",
          content: JSON.stringify({
            tahminMetni: tahminGorevi.response_text.slice(0, 500),
            gercekDisPuanProfili: profil,
          }),
        },
      ],
    });
    if (yanit.stop_reason === "refusal") return null;
    const metin = yanit.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");
    const veri = JSON.parse(metin) as { sapmaVar: boolean; baslik: string; govde: string };
    if (!veri.sapmaVar || !veri.baslik || !veri.govde) return null;
    return { title: veri.baslik.slice(0, 120), body: veri.govde.slice(0, 800) };
  } catch {
    return null;
  }
}
