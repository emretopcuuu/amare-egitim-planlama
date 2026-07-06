import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { Db } from "@/lib/degerlendirme";
import { PERSONA } from "@/lib/ayna";
import { kimlikBloguGetir } from "@/lib/kisiKimligi";

// Özellik 10 — DÖNÜŞÜM KARŞILAŞTIRMASI ("Gün 1 sen vs Gün 3 sen").
// Mühür ekranında kişinin İLK puanlanan görev yanıtından ve SON puanlanan
// yanıtından birer kısa alıntı + AI'nın tek cümlelik fark tespiti gösterilir:
// "Bunu yazan da sensin, bunu yazan da. Aradaki fark 48 saat."
// Bir kez üretilir, participants.donusum_karsilastirma'ya önbelleklenir.
// FAIL-OPEN: her hata null döner — mühür ekranı asla bloklanmaz.

export type DonusumKarsilastirma = {
  ilkAlinti: string;
  sonAlinti: string;
  fark: string;
};

const DONUSUM_SEMASI = {
  type: "object" as const,
  properties: {
    ilkAlinti: {
      type: "string" as const,
      description:
        "Kişinin İLK görev yanıtından seçilmiş KISA alıntı (en fazla 160 karakter). Kişinin KENDİ cümlelerinden kısaltılmış bir seçim olmalı — kelimeleri değiştirme, yeniden yazma; gerekirse baştan/sondan kırp.",
    },
    sonAlinti: {
      type: "string" as const,
      description:
        "Kişinin SON görev yanıtından seçilmiş KISA alıntı (en fazla 160 karakter). Aynı kural: kişinin kendi kelimeleri, kısaltılmış seçim; yeniden yazma yok.",
    },
    fark: {
      type: "string" as const,
      description:
        "İki alıntı arasındaki büyümeyi söyleyen TEK cümle — 'sen' dilinde, sıcak, yargılamayan, büyüme odaklı. Puan/teknik terim yok; küçük ama gerçek farkı göster.",
    },
  },
  required: ["ilkAlinti", "sonAlinti", "fark"],
  additionalProperties: false,
};

function gecerliMi(v: unknown): v is DonusumKarsilastirma {
  const o = v as DonusumKarsilastirma | null;
  return (
    !!o &&
    typeof o === "object" &&
    typeof o.ilkAlinti === "string" &&
    o.ilkAlinti.trim().length > 0 &&
    typeof o.sonAlinti === "string" &&
    o.sonAlinti.trim().length > 0 &&
    typeof o.fark === "string" &&
    o.fark.trim().length > 0
  );
}

function istanbulGunu(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(
    new Date(iso)
  );
}

export async function donusumKarsilastirmaUret(
  db: Db,
  participantId: string
): Promise<DonusumKarsilastirma | null> {
  try {
    // Önbellek: varsa yeniden üretme (mühür anısı sabit kalsın).
    const { data: kisi } = await db
      .from("participants")
      .select("donusum_karsilastirma, full_name")
      .eq("id", participantId)
      .maybeSingle();
    if (!kisi) return null;
    if (gecerliMi(kisi.donusum_karsilastirma)) {
      return kisi.donusum_karsilastirma;
    }

    // İlk ve son puanlanan yanıt (kişinin gerçek cümleleri).
    const { data: yanitlar } = await db
      .from("missions")
      .select("title, response_text, responded_at")
      .eq("participant_id", participantId)
      .eq("status", "scored")
      .not("response_text", "is", null)
      .not("responded_at", "is", null)
      .order("responded_at", { ascending: true });
    const dolu = (yanitlar ?? []).filter(
      (m) => (m.response_text as string | null)?.trim()
    );
    // Anlamlı bir "before/after" için en az 3 puanlı görev ve ilk ile son
    // yanıtın FARKLI günlerde olması gerekir — yoksa karşılaştırma kurulmaz.
    if (dolu.length < 3) return null;
    const ilk = dolu[0];
    const son = dolu[dolu.length - 1];
    if (istanbulGunu(ilk.responded_at as string) === istanbulGunu(son.responded_at as string)) {
      return null;
    }

    if (!process.env.ANTHROPIC_API_KEY) return null;
    const client = new Anthropic();
    const yanit = await client.messages.create({
      // MALİYET: kişi başına BİR kez çalışan kısa üretim → Haiku 4.5 yeterli.
      model: "claude-haiku-4-5",
      max_tokens: 512,
      thinking: { type: "disabled" },
      output_config: { format: { type: "json_schema", schema: DONUSUM_SEMASI } },
      system: `${PERSONA}

Şimdi kampın kapanış anını kuruyorsun: DÖNÜŞÜM KARŞILAŞTIRMASI. Elinde kişinin kamptaki İLK görev yanıtı ve SON görev yanıtı var. Görevin:
1) "ilkAlinti": ilk yanıttan kişinin KENDİ cümlelerinden kısa bir seçim (kırp ama yeniden yazma).
2) "sonAlinti": son yanıttan aynı şekilde kısa bir seçim.
3) "fark": iki alıntı arasındaki büyümeyi söyleyen TEK sıcak cümle — yargılamayan, küçümsemeyen, büyüme odaklı. İki alıntıyı en çok konuşturan (ton, cesaret, netlik, sahiplenme farkı görünür olan) bölümleri seç. Yalnızca JSON döndür.${await kimlikBloguGetir(db, participantId)}`,
      messages: [
        {
          role: "user",
          content: JSON.stringify({
            ad: kisi.full_name?.split(" ")[0] ?? "",
            ilkYanit: {
              gorev: ilk.title,
              gun: istanbulGunu(ilk.responded_at as string),
              metin: (ilk.response_text as string).trim().slice(0, 1200),
            },
            sonYanit: {
              gorev: son.title,
              gun: istanbulGunu(son.responded_at as string),
              metin: (son.response_text as string).trim().slice(0, 1200),
            },
          }),
        },
      ],
    });
    if (yanit.stop_reason === "refusal") return null;
    const metin = yanit.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");
    let veri: unknown;
    try {
      veri = JSON.parse(metin);
    } catch {
      return null;
    }
    if (!gecerliMi(veri)) return null;
    const sonuc: DonusumKarsilastirma = {
      ilkAlinti: veri.ilkAlinti.trim().slice(0, 200),
      sonAlinti: veri.sonAlinti.trim().slice(0, 200),
      fark: veri.fark.trim().slice(0, 300),
    };

    // Önbelleğe yaz — yazma düşse bile sonuç yine döner (bir dahaki görüntülemede
    // yeniden üretilir; en kötü ihtimal küçük bir ek maliyet).
    await db
      .from("participants")
      .update({ donusum_karsilastirma: sonuc })
      .eq("id", participantId);

    return sonuc;
  } catch {
    return null;
  }
}
