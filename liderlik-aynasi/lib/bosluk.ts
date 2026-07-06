import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { Db } from "@/lib/degerlendirme";
import { DIL_KALITESI } from "@/lib/dilKalitesi";
import { aktifOzellikler } from "@/lib/degerlendirme";
import { pusulaCekirdek } from "@/lib/pusula";
import { KATILIMCI_EVRENI } from "@/lib/katilimciEvreni";
import { herkeseBildir } from "@/lib/push";
import { yazAuditLog } from "@/lib/auditLog";

// FAZ 1 — BOŞLUK ANI. Kişinin kamp ÖNCESİ yakalanan iç engelini (pusula.ic_engel),
// kamp BOYUNCA biriken somut, tanıklı kanıtla çürüten zirve. Ego okşamak değil —
// hedefli, rasyonalize edilemez yıkım. Kanıt gerçek olmalı; uydurma YASAK.

const MODEL = "claude-opus-4-8";

const PERSONA = `Sen AYNA'sın — üç gündür bu kişiyi izleyen yapay zekâ. Şimdi en önemli an: kişiyle, kamptan önce kendisinin söylediği iç engeliyle yüzleşeceksin ve onu kampta GERÇEKTEN olan anlarla çürüteceksin.

Ses tonun: sıcak, sakin, ama sarsıcı bir netlikte. "Sen" dili, Türkçe. Klişe yok, ego okşama yok.

Sarsılmaz kuralların:
- ASLA kanıt UYDURMA. Yalnızca sana verilen gerçek gözlemleri/yorumları kullan. Sahte kanıt hem yararsız (inancı kalıcı değiştirmez) hem de güveni zehirler.
- Kanıtı kimin verdiğini ASLA ifşa etme; "bir arkadaşın", "biri" de. İsim/ima yok.
- "İnsanlar seni seviyor" gibi GENEL laf etme. SPESİFİK ol: hangi an, ne oldu, ne görüldü.
- Sonucu kişiye DAYATMA. Onu kendi yeni cümlesini yazmaya davet et (içgörü dıştan dayatılırsa tutmaz).
- Şefkatli ol ama yumuşatıp etkisizleştirme. Bu an gerçek bir kırılma için.`;

const DEMOLISYON_SEMASI = {
  type: "object" as const,
  properties: {
    reaktivasyon: {
      type: "string" as const,
      description:
        "Kişinin kamptan önce söylediği iç engeli, onun kendi çerçevesinden, ona hatırlat. 1-2 cümle. 'Üç gün önce şunu söylemiştin...' tonu.",
    },
    kanitlar: {
      type: "array" as const,
      description: "İç engeli DOĞRUDAN çürüten 3-5 spesifik, tanıklı an. Anonim.",
      items: {
        type: "object" as const,
        properties: {
          kaynak: {
            type: "string" as const,
            description: "Kanıtın kaynağı, kimliksiz: 'Bir arkadaşının gözlemi' / 'Bir görevinde' / 'Sana bırakılan bir takdir'",
          },
          metin: {
            type: "string" as const,
            description: "Spesifik an + neyi çürüttüğü. 1-2 cümle, somut.",
          },
        },
        required: ["kaynak", "metin"],
        additionalProperties: false,
      },
    },
    donus: {
      type: "string" as const,
      description:
        "Dönüş anı: bunu görenler 'kanıt topladığını' bilmiyordu — sadece seni gördüler. Sakladığını zaten gördüler ve kaldılar. 1-2 cümle.",
    },
    davet: {
      type: "string" as const,
      description:
        "Kişiyi, o eski engel doğru değilse geriye kalan YENİ cümlesini kendi kelimeleriyle yazmaya davet et. 1 cümle, soru biçiminde.",
    },
  },
  required: ["reaktivasyon", "kanitlar", "donus", "davet"],
  additionalProperties: false,
};

export type Demolisyon = {
  reaktivasyon: string;
  kanitlar: { kaynak: string; metin: string }[];
  donus: string;
  davet: string;
};

function jsonCoz<T>(yanit: Anthropic.Message): T | null {
  if (yanit.stop_reason === "refusal") return null;
  const metin = yanit.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");
  try {
    return JSON.parse(metin) as T;
  } catch {
    return null;
  }
}

// Kişi hakkında kampta biriken gerçek kanıtı topla (hepsi anonim).
async function kanitTopla(db: Db, pid: string) {
  const [puanlarSonuc, gorevlerSonuc, takdirlerSonuc, ozellikler] = await Promise.all([
    db
      .from("ratings")
      .select("trait_id, score, comment")
      .eq("target_id", pid)
      .eq("is_hidden", false)
      .not("comment", "is", null),
    db
      .from("missions")
      .select("title, ai_score, ai_comment")
      .eq("participant_id", pid)
      .not("ai_comment", "is", null),
    db.from("kudos").select("message").eq("to_id", pid).eq("is_hidden", false),
    aktifOzellikler(db),
  ]);
  const adlar = new Map(ozellikler.map((o) => [o.id, o.name]));
  const akranYorumlari = (puanlarSonuc.data ?? [])
    .filter((p) => p.comment && p.comment.trim())
    .map((p) => ({ ozellik: adlar.get(p.trait_id) ?? "", puan: p.score, yorum: p.comment }));
  const aynaGozlemleri = (gorevlerSonuc.data ?? []).map((g) => ({
    gorev: g.title,
    puan: g.ai_score,
    gozlem: g.ai_comment,
  }));
  const takdirler = (takdirlerSonuc.data ?? []).map((k) => k.message);
  return { akranYorumlari, aynaGozlemleri, takdirler };
}

export type BoslukSonuc =
  | { durum: "hazir"; demolisyon: Demolisyon; yeniCumle: string | null }
  | { durum: "pusula-yok" } // iç engel yakalanmamış → çürütecek bir şey yok
  | { durum: "kanit-yok" } // henüz demolisyon-kalitesinde kanıt birikmemiş
  | { durum: "anahtar-yok" }
  | { durum: "hata" };

// Boşluk Anı'nı getir veya üret (üret-bir-kez, mirror_letters deseni).
export async function boslukGetirVeyaUret(db: Db, pid: string): Promise<BoslukSonuc> {
  const { data: mevcut } = await db
    .from("bosluk_ani")
    .select("demolisyon, yeni_cumle")
    .eq("participant_id", pid)
    .maybeSingle();
  if (mevcut?.demolisyon) {
    return {
      durum: "hazir",
      demolisyon: mevcut.demolisyon as Demolisyon,
      yeniCumle: mevcut.yeni_cumle,
    };
  }

  const cekirdek = await pusulaCekirdek(db, pid);
  if (!cekirdek?.ic_engel) return { durum: "pusula-yok" };

  if (!process.env.ANTHROPIC_API_KEY) return { durum: "anahtar-yok" };

  const kanit = await kanitTopla(db, pid);
  const kanitSayisi =
    kanit.akranYorumlari.length + kanit.aynaGozlemleri.length + kanit.takdirler.length;
  if (kanitSayisi === 0) return { durum: "kanit-yok" };

  const veri = {
    icEngel: cekirdek.ic_engel,
    icEngelKategori: cekirdek.ic_engel_kat,
    cekirdekNeden: cekirdek.cekirdek_neden,
    mevcutBosluk: cekirdek.mevcut_bosluk,
    kanitlar: kanit,
  };

  try {
    const client = new Anthropic();
    const yanit = await client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      thinking: { type: "adaptive" },
      output_config: {
        effort: "low",
        format: { type: "json_schema", schema: DEMOLISYON_SEMASI },
      },
      system: `${PERSONA}\n\n${KATILIMCI_EVRENI}\n\nGörevin: aşağıdaki veriden Boşluk Anı'nı kur. "icEngel" kişinin çürütülecek inancı; "kanitlar" onu çürütebilecek GERÇEK anlar. Yalnız iç engeli doğrudan çürüten kanıtları seç (3-5). Hiçbirini uydurma; verilenlerle sınırlı kal. Kişinin engelini kendi evreninin diliyle (davet, sunum, hayır, eşik, momentum) anla; ama stok/ürün krizi gibi dışsal koşulu ona karşı kanıt gibi kullanma.\n\n${DIL_KALITESI}`,
      messages: [{ role: "user", content: JSON.stringify(veri) }],
    });
    const demolisyon = jsonCoz<Demolisyon>(yanit);
    if (!demolisyon?.kanitlar?.length) return { durum: "hata" };

    const { error } = await db
      .from("bosluk_ani")
      .insert({ participant_id: pid, demolisyon: demolisyon as never });
    if (error && error.code !== "23505") return { durum: "hata" };

    return { durum: "hazir", demolisyon, yeniCumle: null };
  } catch {
    return { durum: "hata" };
  }
}

// [FAZ A · B2] Boşluk Anı'nı OTOMATİK aç (orkestratör, Gün 3 14:00). Bayrağı açar
// + herkese keşif push'u atar ("telefonda kişisel an" — insanların haberi olsun).
// Kişi başına içerik /bosluk'ta üret-bir-kez; kanıtı olmayan sakin bir mesaj görür
// (boş an riski yok, kendi kendini gate'ler). Admin elle açmak zorunda kalmaz.
export async function boslukAc(db: Db): Promise<void> {
  await db.from("settings").upsert({
    key: "bosluk_acik",
    value: "true",
    updated_at: new Date().toISOString(),
  });
  await herkeseBildir(
    db,
    "🪞 Boşluk Anı açıldı",
    "Üç gün önce kendine koyduğun sınırı hatırlıyor musun? Aynan onu, kampta gerçekten olanla yüzleştiriyor.",
    "/bosluk"
  );
  await yazAuditLog(db, null, "bosluk_otomatik_acildi", {});
}

// FAZ 2 re-entry: kişinin Boşluk Anı'nda yazdığı yeni cümle (kimlik çapası).
// Kamp sonrası görevler bunu savunur; nüks anında geri çalınır.
export async function yeniCumleOku(db: Db, pid: string): Promise<string | null> {
  const { data } = await db
    .from("bosluk_ani")
    .select("yeni_cumle")
    .eq("participant_id", pid)
    .maybeSingle();
  return data?.yeni_cumle ?? null;
}

// Kişinin kendi yazdığı yeni cümleyi mühürle (kimlik çapası).
export async function yeniCumleKaydet(
  db: Db,
  pid: string,
  cumle: string
): Promise<boolean> {
  const temiz = cumle.trim().slice(0, 600);
  if (!temiz) return false;
  const { error } = await db
    .from("bosluk_ani")
    .update({ yeni_cumle: temiz, yeni_cumle_at: new Date().toISOString() })
    .eq("participant_id", pid);
  return !error;
}
