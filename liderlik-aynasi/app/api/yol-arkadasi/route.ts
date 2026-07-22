import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { arkadasSec, arkadasKaldir } from "@/lib/yolArkadasi";
import { katilimciyaBildir } from "@/lib/push";

// [B#19] Yol arkadaşı seç / kaldır. Yalnız kişinin sözüne KABUL ile şahit
// olanlar arasından seçilebilir (yetki: soz_tanik kontrolü).
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ hata: "yetkisiz" }, { status: 401 });
  }
  let g: { arkadasId?: unknown; kaldir?: unknown };
  try {
    g = await req.json();
  } catch {
    return Response.json({ hata: "geçersiz" }, { status: 400 });
  }
  const db = supabaseAdmin();

  if (g.kaldir === true) {
    await arkadasKaldir(db, session.sub);
    return Response.json({ ok: true });
  }

  if (typeof g.arkadasId !== "string") {
    return Response.json({ hata: "geçersiz" }, { status: 400 });
  }
  // Yetki: seçilen kişi gerçekten benim şahidim mi?
  const { data: tanik } = await db
    .from("soz_tanik")
    .select("id")
    .eq("soz_sahibi", session.sub)
    .eq("witness_id", g.arkadasId)
    .not("imza_at", "is", null)
    .maybeSingle();
  if (!tanik) return Response.json({ hata: "yetkisiz" }, { status: 403 });

  const ok = await arkadasSec(db, session.sub, g.arkadasId);
  if (ok) {
    await katilimciyaBildir(
      db,
      g.arkadasId,
      "🔥 Biri seni yol arkadaşı seçti",
      `${session.ad.split(" ")[0]} seni 90 günlük yol arkadaşı seçti. Aynı gün adım atınca ortak aleviniz büyür.`,
      "/takip"
    ).catch(() => {});
  }
  return Response.json({ ok });
}
