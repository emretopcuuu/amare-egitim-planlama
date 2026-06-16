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
      yedek[tablo] = await tumKayitlar<unknown>((bas, son) =>
        db.from(tablo).select("*").range(bas, son)
      );
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
