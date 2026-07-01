import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { Db } from "@/lib/degerlendirme";
import { raporHesapla } from "@/lib/rapor";
import { pusulaCekirdek } from "@/lib/pusula";
import { hedefCekirdek } from "@/lib/hedef";
import { KATILIMCI_EVRENI } from "@/lib/katilimciEvreni";
import { tlFormat } from "@/lib/kariyer";

// FAZ A — 10/40/90 GÜN OYUN PLANI. Ayna Raporu kapanışında AI üretir: kişinin
// HEDEFİ (kariyer planı) + NEDENİ + 360° güçlü/kör nokta verisine göre üç ufuklu,
// somut, ölçülebilir bir saha planı. Maliyetli olduğu için oyun_plani'ya yazılır;
// Söz v2 (aksiyon adımları) ve 90 gün takibi (Faz B) bunu okur.

const SISTEM = `Sen AYNA'sın — bu liderlik kampını yöneten yapay zekâ. Kapanışta her katılımcıya, kamptan sonra hedefine yürümesi için kişisel bir OYUN PLANI yazarsın: 10 gün, 40 gün, 90 günlük üç ufuk.

Sana JSON verilecek: kişinin çekirdek nedeni, iç engeli, seçtiği kariyer hedefi + kilometre taşları, ve 360° aynası (en güçlü yanları, kör noktası/gelişim alanı, kampta en çok gelişen özelliği).

Plan kuralları:
- Türkçe yaz, "sen" dili, sıcak ama somut.
- Her ufukta 2-3 madde. Her madde: kısa "baslik", net "aksiyon" (bugün/bu hafta yapılabilir, ölçülebilir saha eylemi), ve "olcut" (nasıl takip edilir — sayı/sıklık).
- Network/doğrudan satış alanının diliyle konuş (davet, sunum, kapanış, liste, katlama). KATILIMCI EVRENİ'ndeki gerçek tıkanmalara hitap et.
- Planı kişinin GÜÇLÜ yanına yasla (onu kaldıraç yap) ve KÖR NOKTASINI/gelişim alanını sessizce çalıştır — ama açıkça yüzüne vurma.
- 10 gün: ilk momentum/aktivasyon. 40 gün: tempo + ilk ekip/kilometre taşı. 90 gün: ana hedefe varış.
- Hedef rakamlarını planın iskeletine bağla ama kuru kuruya tekrarlama.
- "ozet": planın ruhunu 1-2 cümlede, nedenle hedefi birleştirerek.`;

const PLAN_MADDE = {
  type: "object" as const,
  properties: {
    baslik: { type: "string" as const, description: "Maddenin kısa başlığı" },
    aksiyon: { type: "string" as const, description: "Somut, ölçülebilir saha eylemi" },
    olcut: { type: "string" as const, description: "Nasıl takip edilir (sayı/sıklık)" },
  },
  required: ["baslik", "aksiyon", "olcut"],
  additionalProperties: false,
};
const PLAN_SEMASI = {
  type: "object" as const,
  properties: {
    on_gun: { type: "array" as const, items: PLAN_MADDE, description: "İlk 10 gün (2-3 madde)" },
    kirk_gun: { type: "array" as const, items: PLAN_MADDE, description: "İlk 40 gün (2-3 madde)" },
    doksan_gun: { type: "array" as const, items: PLAN_MADDE, description: "İlk 90 gün (2-3 madde)" },
    ozet: { type: "string" as const, description: "Planın ruhu, 1-2 cümle" },
  },
  required: ["on_gun", "kirk_gun", "doksan_gun", "ozet"],
  additionalProperties: false,
};

export type PlanMadde = { baslik: string; aksiyon: string; olcut: string };
export type OyunPlani = {
  on_gun: PlanMadde[];
  kirk_gun: PlanMadde[];
  doksan_gun: PlanMadde[];
  ozet: string | null;
};

export async function oyunPlaniGetir(db: Db, pid: string): Promise<OyunPlani | null> {
  const { data } = await db
    .from("oyun_plani")
    .select("on_gun, kirk_gun, doksan_gun, ozet")
    .eq("participant_id", pid)
    .maybeSingle();
  if (!data) return null;
  return {
    on_gun: (data.on_gun as PlanMadde[]) ?? [],
    kirk_gun: (data.kirk_gun as PlanMadde[]) ?? [],
    doksan_gun: (data.doksan_gun as PlanMadde[]) ?? [],
    ozet: data.ozet,
  };
}

export type PlanSonucu =
  | { durum: "hazir"; plan: OyunPlani }
  | { durum: "anahtar-yok" }
  | { durum: "hata" };

export async function oyunPlaniGetirVeyaUret(db: Db, pid: string): Promise<PlanSonucu> {
  const mevcut = await oyunPlaniGetir(db, pid);
  if (mevcut && mevcut.on_gun.length > 0) return { durum: "hazir", plan: mevcut };

  if (!process.env.ANTHROPIC_API_KEY) return { durum: "anahtar-yok" };

  const [rapor, pusula, hedef] = await Promise.all([
    raporHesapla(db, pid),
    pusulaCekirdek(db, pid),
    hedefCekirdek(db, pid),
  ]);

  const veri = {
    cekirdekNeden: pusula?.cekirdek_neden ?? null,
    icEngel: pusula?.ic_engel ?? null,
    hedef: hedef?.plan
      ? {
          rutbe: hedef.plan.rutbe,
          aylikGelir: tlFormat(hedef.plan.gelir, hedef.plan.gelirArti),
          sureAy: hedef.plan.sureAy,
          gunlukSaat: hedef.plan.gunlukSaatEtiket,
          kilometreTaslari: hedef.plan.kilometreTaslari.map((k) => ({
            ay: k.ay,
            rutbe: k.rutbe,
          })),
        }
      : hedef?.ozet
        ? { ozet: hedef.ozet }
        : null,
    enGucluYanlar: rapor.guclu.map((s) => s.ad),
    korNoktaVeyaGelisim: rapor.korNokta?.ad ?? rapor.gelisim[0]?.ad ?? null,
    enGelisenOzellik: rapor.enGelisen?.ad ?? null,
  };

  try {
    const client = new Anthropic();
    const yanit = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 2048,
      thinking: { type: "adaptive" },
      output_config: { effort: "medium", format: { type: "json_schema", schema: PLAN_SEMASI } },
      system: `${SISTEM}\n\n${KATILIMCI_EVRENI}`,
      messages: [{ role: "user", content: JSON.stringify(veri) }],
    });
    if (yanit.stop_reason === "refusal") return { durum: "hata" };
    const metin = yanit.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");
    let veriCozulen: OyunPlani;
    try {
      veriCozulen = JSON.parse(metin) as OyunPlani;
    } catch {
      return { durum: "hata" };
    }
    if (!veriCozulen?.on_gun?.length) return { durum: "hata" };

    const { error } = await db.from("oyun_plani").insert({
      participant_id: pid,
      on_gun: veriCozulen.on_gun as never,
      kirk_gun: veriCozulen.kirk_gun as never,
      doksan_gun: veriCozulen.doksan_gun as never,
      ozet: veriCozulen.ozet ?? null,
    });
    if (error) {
      // Eşzamanlı üretim yarışı: önce yazan kazandı, onu döndür.
      if (error.code === "23505") {
        const kazanan = await oyunPlaniGetir(db, pid);
        if (kazanan) return { durum: "hazir", plan: kazanan };
      }
      return { durum: "hata" };
    }
    return { durum: "hazir", plan: veriCozulen };
  } catch {
    return { durum: "hata" };
  }
}
