import { adminOturumu } from "@/lib/auth/admin";
import { supabaseAdmin } from "@/lib/supabase/server";
import { tumKayitlar } from "@/lib/tumKayitlar";
import { tr } from "@/lib/i18n/tr";

export const maxDuration = 60;

// Felaket sigortası: tüm temel tabloların tek dosyada JSON yedeği. Ses/video
// dosyaları değil yolları yedeklenir (özel bucket'ta kalır). Yalnız admin.
const TABLOLAR = [
  "participants",
  "traits",
  "waves",
  "assignments",
  "ratings",
  "missions",
  "predictions",
  "mirror_letters",
  "voice_profiles",
  "churn_radar",
  "momentum_scores",
  "kudos",
  "photos",
  "pairs",
  "pair_messages",
  "pledges",
  "settings",
] as const;

// KVKK: katılımcının PAYLAŞTIĞI ham içerik (yanıtlar, yorumlar, mektup metni,
// ikili sohbet) admin'in indirdiği yedekte YER ALMAZ — "[KVKK]" ile maskelenir.
// Yedeğin amacı yapı+skor kurtarma; içerik zaten canlı DB'de yaşar.
const GIZLI_ALANLAR: Record<string, string[]> = {
  ratings: ["comment"],
  missions: ["response_text", "reflection_text", "reflection_reply", "kacirma_sebebi"],
  mirror_letters: ["content"],
  pair_messages: ["message"],
};

function kvkkMaskele(tablo: string, satirlar: unknown[]): unknown[] {
  const alanlar = GIZLI_ALANLAR[tablo];
  if (!alanlar) return satirlar;
  return satirlar.map((s) => {
    const kopya = { ...(s as Record<string, unknown>) };
    for (const a of alanlar) {
      if (kopya[a] != null) kopya[a] = "[KVKK]";
    }
    return kopya;
  });
}

export async function GET() {
  if (!(await adminOturumu())) {
    return Response.json({ hata: tr.admin.yetkisiz }, { status: 403 });
  }
  const db = supabaseAdmin();

  const yedek: Record<string, unknown> = {
    olusturulma: new Date().toISOString(),
    surum: 1,
  };
  // Sayfa sayfa çek: ~1000 satır sınırı büyük tabloları (atama/puan) eksik
  // yedeklerdi — felaket sigortasında kabul edilemez.
  for (const tablo of TABLOLAR) {
    try {
      const satirlar = await tumKayitlar<unknown>((bas, son) =>
        db.from(tablo).select("*").range(bas, son)
      );
      yedek[tablo] = kvkkMaskele(tablo, satirlar);
    } catch (e) {
      const mesaj = e instanceof Error ? e.message : "bilinmeyen hata";
      return Response.json(
        { hata: `${tablo} yedeklenemedi: ${mesaj}` },
        { status: 500 }
      );
    }
  }

  const tarih = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
  return new Response(JSON.stringify(yedek, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="liderlik-aynasi-yedek-${tarih}.json"`,
    },
  });
}
