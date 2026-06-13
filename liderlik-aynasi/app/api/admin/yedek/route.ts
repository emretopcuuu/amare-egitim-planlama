import { adminOturumu } from "@/lib/auth/admin";
import { supabaseAdmin } from "@/lib/supabase/server";
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
  for (const tablo of TABLOLAR) {
    const { data, error } = await db.from(tablo).select("*");
    if (error) {
      return Response.json(
        { hata: `${tablo} yedeklenemedi: ${error.message}` },
        { status: 500 }
      );
    }
    yedek[tablo] = data ?? [];
  }

  const tarih = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
  return new Response(JSON.stringify(yedek, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="liderlik-aynasi-yedek-${tarih}.json"`,
    },
  });
}
