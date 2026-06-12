import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { Db } from "@/lib/degerlendirme";
import { seslendir, sesYapilandirildiMi } from "@/lib/eleven";

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

/**
 * Görev fısıltısı: AYNA'nın yeni görevini, klonu hazır katılımcının kendi
 * sesiyle mp3'e çevirip storage'a yazar ve missions.voice_path'i günceller.
 * Fısıltı süstür — hangi adımda düşerse düşsün görev akışını asla kırmaz.
 */
export async function gorevSeslendir(
  db: Db,
  katilimciId: string,
  gorevId: string,
  baslik: string,
  govde: string,
  oncelikli = false
): Promise<void> {
  if (!sesYapilandirildiMi()) return;
  try {
    // Kredi bütçesi: kişi başı son 24 saatte en çok 2 fısıltı.
    // SÖZ gibi tek seferlik anlar 'oncelikli' ile tavanı aşar.
    if (!oncelikli) {
      const { count } = await db
        .from("missions")
        .select("id", { count: "exact", head: true })
        .eq("participant_id", katilimciId)
        .not("voice_path", "is", null)
        .gt(
          "issued_at",
          new Date(Date.now() - 24 * 3_600_000).toISOString()
        );
      if ((count ?? 0) >= 2) return;
    }

    const { data: profil } = await db
      .from("voice_profiles")
      .select("voice_id, status")
      .eq("participant_id", katilimciId)
      .maybeSingle();
    if (!profil?.voice_id || profil.status !== "klonlandi") return;

    const metin = `${baslik}. ${govde}`.slice(0, 450);
    const mp3 = await seslendir(profil.voice_id, metin);
    const yolu = `${katilimciId}/gorev-${gorevId}.mp3`;
    const yukleme = await db.storage
      .from("sesler")
      .upload(yolu, Buffer.from(mp3), { contentType: "audio/mpeg", upsert: true });
    if (yukleme.error) return;
    await db.from("missions").update({ voice_path: yolu }).eq("id", gorevId);
  } catch {
    // sessiz kal: fısıltı yoksa görev metin olarak yaşamaya devam eder
  }
}
