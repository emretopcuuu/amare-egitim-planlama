import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { Db } from "@/lib/degerlendirme";

// FAZ D2: Grup ödevleri. Grubun Ön Farkındalık profillerini toplayıp baskın
// ortak sinyali bulur; AYNA buna göre grup-içi ya da grup-birlikte ödev üretir.

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

const OZ_ALAN_AD: Record<string, string> = {
  oz_saygi: "Öz Saygı",
  oz_guven: "Öz Güven",
  oz_yeterlilik: "Öz Yeterlilik",
};

type OFProfil = {
  katman1?: { enZayif?: string | null };
  katman2?: { enBuyukIki?: { ad: string; acik: number }[] };
  katman3?: { ritim?: string };
};

export type GrupOzet = {
  takim: string;
  uyeSayisi: number;
  profilliUye: number;
  baskinZayifAlan: string | null;
  baskinAciklar: { baslik: string; sayi: number }[];
  ritim: { duzenli: number; patlayan: number };
};

// Bir takımın ÖF agregatı: en çok paylaşılan zayıf alan + en çok paylaşılan açık.
export async function grupOzeti(db: Db, takim: string): Promise<GrupOzet> {
  const { data: uyeler } = await db
    .from("participants")
    .select("id")
    .eq("team", takim)
    .eq("role", "participant");
  const idler = (uyeler ?? []).map((u) => u.id);
  let oflar: { profil: unknown }[] = [];
  if (idler.length) {
    const { data } = await db.from("on_farkindalik").select("profil").in("participant_id", idler);
    oflar = data ?? [];
  }

  const zayifSay = new Map<string, number>();
  const acikSay = new Map<string, number>();
  let duzenli = 0;
  let patlayan = 0;
  for (const o of oflar) {
    const p = o.profil as OFProfil | null;
    if (!p) continue;
    const z = p.katman1?.enZayif;
    if (z) zayifSay.set(z, (zayifSay.get(z) ?? 0) + 1);
    for (const a of p.katman2?.enBuyukIki ?? []) {
      if (a.acik > 0) acikSay.set(a.ad, (acikSay.get(a.ad) ?? 0) + 1);
    }
    if (p.katman3?.ritim === "duzenli") duzenli++;
    else if (p.katman3?.ritim === "patlayan") patlayan++;
  }
  const baskinZayif = [...zayifSay.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const baskinAciklar = [...acikSay.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([baslik, sayi]) => ({ baslik, sayi }));

  return {
    takim,
    uyeSayisi: idler.length,
    profilliUye: oflar.filter((o) => o.profil && (o.profil as OFProfil).katman1).length,
    baskinZayifAlan: baskinZayif ? OZ_ALAN_AD[baskinZayif] ?? baskinZayif : null,
    baskinAciklar,
    ritim: { duzenli, patlayan },
  };
}

const PERSONA =
  "Sen AYNA'sın — liderlik kampını yöneten yapay zekâ direktör. Sıcak, gizemli, kısa ve vurucu; 'sen/siz' dilinde Türkçe. Asla yargılamaz, kör noktayı yüzüne vurmaz.";

// Grubun agregatına göre TEK grup ödevi üretir ve saklar (eski aktifi pasifler).
export async function grupOdevUret(
  db: Db,
  takim: string,
  tip: "grup_ici" | "grup_birlikte"
): Promise<{ baslik: string; govde: string; hedef: string | null } | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  const ozet = await grupOzeti(db, takim);
  if (ozet.profilliUye === 0) return null;

  // GRUP-BİRLİKTE için somut eşleştirme: üyelerin adı + en zayıf alanı çekilir;
  // AYNA bunlara göre tamamlayıcı İKİLİLER kurup görevi İSİMLERLE yazar.
  let uyeProfilleri: { ad: string; zayifAlan: string | null }[] = [];
  if (tip === "grup_birlikte") {
    const { data: uyeler } = await db
      .from("participants")
      .select("id, full_name")
      .eq("team", takim)
      .eq("role", "participant");
    const idler = (uyeler ?? []).map((u) => u.id);
    let ofler: { participant_id: string; profil: unknown }[] = [];
    if (idler.length) {
      const { data } = await db
        .from("on_farkindalik")
        .select("participant_id, profil")
        .in("participant_id", idler);
      ofler = data ?? [];
    }
    const ofHarita = new Map(ofler.map((o) => [o.participant_id, o.profil as OFProfil | null]));
    uyeProfilleri = (uyeler ?? []).map((u) => {
      const p = ofHarita.get(u.id);
      const z = p?.katman1?.enZayif;
      return {
        ad: u.full_name,
        zayifAlan: z ? OZ_ALAN_AD[z] ?? z : null,
      };
    });
  }

  const baglam = {
    takim,
    tip,
    uyeSayisi: ozet.uyeSayisi,
    baskinZayifAlan: ozet.baskinZayifAlan,
    baskinAciklar: ozet.baskinAciklar,
    ritim: ozet.ritim,
    ...(tip === "grup_birlikte" ? { uyeler: uyeProfilleri } : {}),
  };

  const tipYonerge =
    tip === "grup_ici"
      ? "GRUP-İÇİ ödev: grubun ÜYELERİ BİRLİKTE, paylaştıkları ortak açık/zayıf alan üzerine çalışır. Tek bir somut, gözlenebilir grup eylemi kur (birlikte yapılacak)."
      : "GRUP-BİRLİKTE ödev: bağlamdaki \"uyeler\" listesine bakarak üyeleri SOMUT İKİLİLER halinde EŞLEŞTİR — birinin zayıf olduğu alanda diğeri ona destek olacak şekilde tamamlayıcı kur (tek sayıda üye varsa bir üçlü olabilir). Görev metninde eşleştirmeleri AÇIKÇA İSİMLE yaz (örn: \"Ahmet ↔ Mehmet\"). Soyut \"ikişerli eşleşin\" DEME; gerçek isimlerle kim-kimle net olsun. Her ikili karşılıklı koçluk yapsın: herkes hem öğretir hem öğrenir.";

  const SEMA = {
    type: "object" as const,
    properties: {
      baslik: { type: "string" as const, description: "Kısa, çekici grup ödevi başlığı." },
      govde: { type: "string" as const, description: "Grubun ne yapacağını anlatan 2-4 cümle, somut ve gözlenebilir." },
      hedef: { type: "string" as const, description: "Hedeflenen ortak açık/alan, 3-6 kelime." },
    },
    required: ["baslik", "govde", "hedef"],
    additionalProperties: false,
  };

  try {
    const client = new Anthropic();
    const yanit = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 1024,
      thinking: { type: "disabled" },
      output_config: { effort: "low", format: { type: "json_schema", schema: SEMA } },
      system: `${PERSONA}

Görevin: bir kamp grubuna TEK bir ödev üret. ${tipYonerge}

Bağlamdaki "baskinZayifAlan" ve "baskinAciklar" grubun Ön Farkındalık çalışmasından çıkan ORTAK gelişim alanlarıdır — ödevi bunlara göre hedefle. Ritim "patlayan" ağırlıksa sürekliliği de çalıştır. Kör noktayı/açığı açıkça yüzüne vurma; ödev onu sessizce çalışsın. Kamp ortamında, bir günde yapılabilir, gözlenebilir olsun.`,
      messages: [{ role: "user", content: JSON.stringify(baglam) }],
    });
    const veri = jsonCoz<{ baslik: string; govde: string; hedef: string }>(yanit);
    if (!veri?.baslik || !veri.govde) return null;

    // Aynı takım+tip için eski aktifleri pasifle, yenisini ekle.
    await db.from("grup_odev").update({ aktif: false }).eq("takim", takim).eq("tip", tip).eq("aktif", true);
    const { error } = await db.from("grup_odev").insert({
      takim,
      tip,
      baslik: veri.baslik.slice(0, 120),
      govde: veri.govde.slice(0, 1000),
      hedef: (veri.hedef ?? "").slice(0, 120) || null,
      aktif: true,
    });
    if (error) return null;
    return { baslik: veri.baslik, govde: veri.govde, hedef: veri.hedef ?? null };
  } catch {
    return null;
  }
}
