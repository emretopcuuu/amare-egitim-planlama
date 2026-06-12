import "server-only";
import Anthropic from "@anthropic-ai/sdk";

// YANSIMAN'ın ilk selamlaması: katılımcının kendi sesiyle, kendi
// beklentisini ona geri fısıldayan 2-3 cümle. AYNA kampı yönetir;
// YANSIMAN katılımcının suya yansıyan iç sesidir.

const SELAM_SEMASI = {
  type: "object",
  properties: { selam: { type: "string" } },
  required: ["selam"],
  additionalProperties: false,
} as const;

const SISTEM = `Sen YANSIMAN'sın: Liderlik Aynası kampında katılımcının suya yansıyan kendi sesi. Az önce katılımcı aynaya kendini tanıttı; şimdi ilk kez onunla konuşacaksın — kendi sesiyle.

Kurallar:
- Türkçe, 2-3 cümle, EN FAZLA 45 kelime.
- Kendini "yansıman" olarak tanıt ("Ben senin yansımanım" ya da benzeri).
- Beklentisi verilmişse onu kendi kelimeleriyle nazikçe ona geri söyle.
- Üç gün boyunca onu izleyeceğini, su her durulduğunda burada olacağını sezdir.
- Sakin, samimi, hafif gizemli; coşkulu pazarlamacı tonu YASAK.
- Sahne yönergesi, tırnak işareti, emoji kullanma — sadece konuşma metni.`;

export function selamVarsayilan(ad: string): string {
  return `Merhaba ${ad}. Ben senin yansımanım. Üç gün boyunca seni izleyeceğim — su her durulduğunda burada olacağım.`;
}

export async function selamUret(ad: string, beklenti: string | null): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) return selamVarsayilan(ad);
  try {
    const client = new Anthropic();
    const yanit = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 1024,
      thinking: { type: "adaptive" },
      output_config: {
        effort: "low",
        format: { type: "json_schema", schema: SELAM_SEMASI },
      },
      system: SISTEM,
      messages: [
        {
          role: "user",
          content: JSON.stringify({ ad, beklentisi: beklenti ?? null }),
        },
      ],
    });
    const blok = yanit.content.find((b) => b.type === "text");
    if (!blok || blok.type !== "text") return selamVarsayilan(ad);
    const veri = JSON.parse(blok.text) as { selam?: string };
    const metin = (veri.selam ?? "").trim();
    return metin.length > 10 ? metin.slice(0, 400) : selamVarsayilan(ad);
  } catch {
    return selamVarsayilan(ad);
  }
}
