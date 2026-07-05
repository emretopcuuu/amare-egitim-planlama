import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { Db } from "@/lib/degerlendirme";
import { DIL_KALITESI } from "@/lib/dilKalitesi";
import { pusulaCekirdek } from "@/lib/pusula";
import { hedefCekirdek } from "@/lib/hedef";
import { KATILIMCI_EVRENI } from "@/lib/katilimciEvreni";
import { tlFormat } from "@/lib/kariyer";
import type { PlanMadde, PlanUfuk } from "@/lib/oyunPlani";

// PLAN ATÖLYESİ — DANIŞMAN (hibrit "bunu benimle konuş"). Kişi bir maddede
// takılırsa AYNA tavsiye verir ve alternatif SOMUT öneriler sunar — ama KARAR
// kişinin. AI asla "şunu yap" emri vermez; "şu seçenekler var, sen seç/yaz" der.

const UFUK_ETIKET: Record<PlanUfuk, string> = {
  ilk_72_saat: "İlk 72 saat",
  on_gun: "İlk 10 gün",
  kirk_gun: "İlk 40 gün",
  doksan_gun: "İlk 90 gün",
};

const SISTEM = `Sen AYNA'sın — kişinin 90 günlük oyun planını KENDİSİNİN kurmasına yardım eden bir danışmansın. Kişi bir plan maddesinde takıldı ve senden akıl istiyor.

Rolün DANIŞMAN, karar verici DEĞİL. Şunu asla yapma: "şunu yapmalısın" diye emir verme. Bunun yerine: kısa bir tavsiye ver (neden önemli, nasıl gerçekçi olur) ve kişinin SEÇEBİLECEĞİ ya da üstüne KENDİ cümlesini yazabileceği 2 somut alternatif öneri sun. Karar ve son cümle her zaman kişinin.

Sana JSON verilecek: kişinin çekirdek nedeni, kariyer hedefi, üstünde çalıştığı ufuk ve mevcut madde. Yanıtın:
- "tavsiye": 2-3 cümle, sıcak, sen dili. Kişiyi düşündüren, seçenek açan bir akıl. Dayatma yok.
- "secenekler": 2 alternatif madde. Her biri {baslik, aksiyon, olcut}: kısa başlık, o ufukta yapılabilir ölçülebilir eylem, ve ölçüt (sayı/sıklık). Network/doğrudan satış diliyle, kişinin hedefine bağlı.`;

const DANIS_SEMASI = {
  type: "object" as const,
  properties: {
    tavsiye: { type: "string" as const, description: "2-3 cümle danışman tavsiyesi (dayatma değil)" },
    secenekler: {
      type: "array" as const,
      description: "2 alternatif somut madde önerisi",
      items: {
        type: "object" as const,
        properties: {
          baslik: { type: "string" as const },
          aksiyon: { type: "string" as const },
          olcut: { type: "string" as const },
        },
        required: ["baslik", "aksiyon", "olcut"],
        additionalProperties: false,
      },
    },
  },
  required: ["tavsiye", "secenekler"],
  additionalProperties: false,
};

export type DanismanSonuc =
  | { durum: "hazir"; tavsiye: string; secenekler: PlanMadde[] }
  | { durum: "anahtar-yok" }
  | { durum: "hata" };

export async function planMaddesineDanis(
  db: Db,
  pid: string,
  ufuk: PlanUfuk,
  madde: PlanMadde,
  soru: string | null
): Promise<DanismanSonuc> {
  if (!process.env.ANTHROPIC_API_KEY) return { durum: "anahtar-yok" };

  const [pusula, hedef] = await Promise.all([pusulaCekirdek(db, pid), hedefCekirdek(db, pid)]);

  const veri = {
    cekirdekNeden: pusula?.cekirdek_neden ?? null,
    icEngel: pusula?.ic_engel ?? null,
    hedef: hedef?.plan
      ? { rutbe: hedef.plan.rutbe, aylikGelir: tlFormat(hedef.plan.gelir, hedef.plan.gelirArti), sureAy: hedef.plan.sureAy }
      : hedef?.ozet
        ? { ozet: hedef.ozet }
        : null,
    ufuk: UFUK_ETIKET[ufuk],
    mevcutMadde: { baslik: madde.baslik, aksiyon: madde.aksiyon, olcut: madde.olcut },
    kisininSorusu: (soru ?? "").trim().slice(0, 400) || null,
  };

  try {
    const client = new Anthropic();
    const yanit = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 1024,
      thinking: { type: "adaptive" },
      output_config: { effort: "low", format: { type: "json_schema", schema: DANIS_SEMASI } },
      system: `${SISTEM}\n\n${KATILIMCI_EVRENI}\n\n${DIL_KALITESI}`,
      messages: [{ role: "user", content: JSON.stringify(veri) }],
    });
    if (yanit.stop_reason === "refusal") return { durum: "hata" };
    const metin = yanit.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");
    let ham: { tavsiye: string; secenekler: { baslik: string; aksiyon: string; olcut: string }[] };
    try {
      ham = JSON.parse(metin);
    } catch {
      return { durum: "hata" };
    }
    if (!ham?.tavsiye) return { durum: "hata" };
    return {
      durum: "hazir",
      tavsiye: ham.tavsiye,
      secenekler: (ham.secenekler ?? []).slice(0, 2).map((s) => ({
        baslik: s.baslik,
        aksiyon: s.aksiyon,
        olcut: s.olcut,
        kaynak: "duzenlendi" as const,
      })),
    };
  } catch {
    return { durum: "hata" };
  }
}
