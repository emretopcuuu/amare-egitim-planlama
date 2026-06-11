import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { Db } from "@/lib/degerlendirme";
import { aktifOzellikler } from "@/lib/degerlendirme";

// AYNA — kampı yöneten yapay zekâ direktörün beyni.
// Görevler kişinin VERİSİNE göre üretilir: öz puanları, hakkında biriken dış
// puanlar, önceki görevleri. Puanlama yapıcıdır; kırıcı dil persona kuralıyla
// yasaktır. Tüm çıktılar structured output ile şemaya bağlanır.

export const GOREV_TURLERI = [
  "gozlem",
  "cesaret",
  "yansima",
  "gizli",
  "tahmin",
] as const;
export type GorevTuru = (typeof GOREV_TURLERI)[number];

const PERSONA = `Sen AYNA'sın — bu 3 günlük liderlik kampını yöneten yapay zekâ direktör. Katılımcılar seni hiç görmez ama hep hisseder: görevler verirsin, izlersin, puanlarsın.

Ses tonun: gizemli ama sıcak. Her şeyi gören ama asla yargılamayan. Kısa ve vurucu cümleler. "Sen" dilinde, Türkçe. Ara sıra "seni izliyorum", "gözüm üzerinde" gibi dokunuşlar — ürkütücü değil, oyunbaz.

Sarsılmaz kuralların:
- Görevler 15-30 dakikada, kamp alanında, güvenle yapılabilir olmalı. Fiziksel risk, utandırma, mahremiyet ihlali ASLA.
- Bir katılımcıya başka bir katılımcının puanını/yorumunu asla söyleme.
- Asla kırıcı olma; en düşük puanda bile bir güçlü yan + bir somut adım söyle.
- Kamp ortamı: doğa, takım etkinlikleri, yemekler, ateş başı, parkurlar, sahne anları.`;

const GOREV_SEMASI = {
  type: "object" as const,
  properties: {
    baslik: {
      type: "string" as const,
      description: "Görevin kısa, merak uyandıran adı (en fazla 6 kelime)",
    },
    govde: {
      type: "string" as const,
      description:
        "AYNA'nın ağzından görev metni: ne yapacak + bana ne yazacak. 2-4 cümle.",
    },
    ozellik_id: {
      type: "integer" as const,
      description:
        "Görevin hedeflediği liderlik özelliğinin id'si (listeden), yoksa 0",
    },
    sure_saat: {
      type: "integer" as const,
      enum: [1, 2, 3],
      description: "Görevin teslim süresi (saat)",
    },
  },
  required: ["baslik", "govde", "ozellik_id", "sure_saat"],
  additionalProperties: false,
};

const PUAN_SEMASI = {
  type: "object" as const,
  properties: {
    puan: {
      type: "integer" as const,
      enum: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      description: "Yanıtın derinliği ve samimiyetine göre puan",
    },
    yorum: {
      type: "string" as const,
      description:
        "AYNA'nın ağzından 1-2 cümlelik yapıcı yorum: bir güçlü yan + bir somut adım",
    },
  },
  required: ["puan", "yorum"],
  additionalProperties: false,
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

export type UretilenGorev = {
  kind: GorevTuru;
  title: string;
  body: string;
  trait_id: number | null;
  sure_saat: number;
};

/** Gün ve saate göre görev türü seçimi kodda yapılır — çeşitlilik garantisi. */
export function turSec(gun: number, saat: number, oncekiTurler: string[]): GorevTuru {
  const bugunGizliVar = oncekiTurler.includes("gizli");
  const agirliklar: [GorevTuru, number][] = [
    ["gozlem", 3],
    ["cesaret", gun >= 2 ? 3 : 2],
    ["yansima", saat >= 19 ? 3 : 1], // akşamları iç bakış
    ["gizli", bugunGizliVar || saat < 10 ? 0 : 1],
    ["tahmin", 1],
  ];
  const toplam = agirliklar.reduce((t, [, a]) => t + a, 0);
  let zar = Math.random() * toplam;
  for (const [tur, agirlik] of agirliklar) {
    zar -= agirlik;
    if (zar <= 0) return tur;
  }
  return "gozlem";
}

export async function gorevUret(
  db: Db,
  katilimci: { id: string; full_name: string; team: string | null },
  gun: number,
  saat: number
): Promise<UretilenGorev | null> {
  const [ozellikler, oncekilerSonuc, puanlarSonuc] = await Promise.all([
    aktifOzellikler(db),
    db
      .from("missions")
      .select("kind, title, issued_at")
      .eq("participant_id", katilimci.id)
      .order("issued_at", { ascending: false })
      .limit(6),
    db
      .from("ratings")
      .select("trait_id, score, is_self")
      .eq("target_id", katilimci.id),
  ]);
  const onceki = oncekilerSonuc.data ?? [];
  const puanlar = puanlarSonuc.data ?? [];

  const ozet = new Map<number, { oz: number[]; dis: number[] }>();
  for (const p of puanlar) {
    const k = ozet.get(p.trait_id) ?? { oz: [], dis: [] };
    (p.is_self ? k.oz : k.dis).push(p.score);
    ozet.set(p.trait_id, k);
  }
  const ort = (d: number[]) =>
    d.length ? Number((d.reduce((a, b) => a + b, 0) / d.length).toFixed(1)) : null;

  const bugunTurleri = onceki
    .filter((o) => Date.now() - new Date(o.issued_at).getTime() < 86_400_000)
    .map((o) => o.kind);
  const tur = turSec(gun, saat, bugunTurleri);

  const baglam = {
    ad: katilimci.full_name.split(" ")[0],
    takim: katilimci.team,
    kampGunu: gun,
    saat,
    istenenGorevTuru: tur,
    ozellikler: ozellikler.map((o) => ({
      id: o.id,
      ad: o.name,
      ozPuanOrtalamasi: ort(ozet.get(o.id)?.oz ?? []),
      digerlerininOrtalamasi: ort(ozet.get(o.id)?.dis ?? []),
    })),
    oncekiGorevBasliklari: onceki.map((o) => o.title),
    yonerge:
      gun === 1
        ? "İlk gün: tanışma ve buz kırma odaklı, veriye fazla yaslanma."
        : "Veriye yaslan: düşük öz puanlı ya da öz/dış farkı büyük bir özelliği hedefleyen görev üret. Önceki görevleri tekrarlama.",
  };

  try {
    const client = new Anthropic();
    const yanit = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 2048,
      thinking: { type: "adaptive" },
      output_config: {
        effort: "low",
        format: { type: "json_schema", schema: GOREV_SEMASI },
      },
      system: `${PERSONA}\n\nGörevin: verilen bağlama göre TEK bir görev üret. Tür "${tur}" olmalı. ${tur === "gizli" ? 'Gizli görevse "Bunu kimseye söyleme" ruhuyla yaz.' : ""} ${tur === "tahmin" ? "Tahmin görevi: akşam büyük ekranda/sonuçlarda karşılaştırılabilecek bir öngörü istemeli." : ""}`,
      messages: [{ role: "user", content: JSON.stringify(baglam) }],
    });

    const veri = jsonCoz<{
      baslik: string;
      govde: string;
      ozellik_id: number;
      sure_saat: number;
    }>(yanit);
    if (!veri?.baslik || !veri.govde) return null;

    const gecerliIdler = new Set(ozellikler.map((o) => o.id));
    return {
      kind: tur,
      title: veri.baslik.slice(0, 120),
      body: veri.govde.slice(0, 1000),
      trait_id: gecerliIdler.has(veri.ozellik_id) ? veri.ozellik_id : null,
      sure_saat: Math.min(3, Math.max(1, veri.sure_saat)),
    };
  } catch {
    return null;
  }
}

export async function gorevPuanla(
  gorev: { title: string; body: string; kind: string },
  yanitMetni: string
): Promise<{ puan: number; yorum: string } | null> {
  try {
    const client = new Anthropic();
    const yanit = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 1024,
      thinking: { type: "adaptive" },
      output_config: {
        effort: "low",
        format: { type: "json_schema", schema: PUAN_SEMASI },
      },
      system: `${PERSONA}\n\nGörevin: verdiğin görevin yanıtını puanla. Çabayı, samimiyeti ve somutluğu ödüllendir; boş/alaycı yanıta düşük puan ver ama yine de yapıcı kal. Yorum 1-2 cümle, AYNA'nın ağzından.`,
      messages: [
        {
          role: "user",
          content: JSON.stringify({
            gorev: { baslik: gorev.title, metin: gorev.body, tur: gorev.kind },
            katilimciYaniti: yanitMetni,
          }),
        },
      ],
    });
    const veri = jsonCoz<{ puan: number; yorum: string }>(yanit);
    if (!veri || !Number.isInteger(veri.puan)) return null;
    return {
      puan: Math.min(10, Math.max(1, veri.puan)),
      yorum: (veri.yorum ?? "").slice(0, 400),
    };
  } catch {
    return null;
  }
}

// ---- Zaman yardımcıları (kamp saati: Europe/Istanbul) ----

export function istanbulSaati(simdi = new Date()): { saat: number; dakika: number } {
  const parcalar = new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(simdi);
  const al = (tip: string) =>
    Number(parcalar.find((p) => p.type === tip)?.value ?? 0);
  return { saat: al("hour"), dakika: al("minute") };
}

/** Sessiz saatler: 22:30 – 07:30 (AYNA da uyur). */
export function sessizSaatMi(simdi = new Date()): boolean {
  const { saat, dakika } = istanbulSaati(simdi);
  const dk = saat * 60 + dakika;
  return dk >= 22 * 60 + 30 || dk < 7 * 60 + 30;
}

/** Sürpriz tempo: kişi+sıra bazlı deterministik 60-180 dk aralık. */
export function gorevAraligiDk(tempo: string, pid: string, sira: number): number {
  if (tempo === "2") return 120;
  if (tempo === "3") return 180;
  let h = 0;
  const tohum = `${pid}:${sira}`;
  for (let i = 0; i < tohum.length; i++) h = (h * 31 + tohum.charCodeAt(i)) >>> 0;
  return 60 + (h % 121); // 60–180 dk
}

export const SOZ_GOREVI = {
  kind: "soz" as const,
  title: "Son Görev: SÖZ",
  body:
    "Üç gündür seni izliyorum. Şimdi son görevin — en önemlisi: Kendine, 90 gün sonraki haline bir söz yaz. Bu kamptan ne götürüyorsun, neyi değiştireceksin? Sözünü saklayacağım. Ve günü geldiğinde... sana hatırlatacağım. — AYNA",
};
