import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { unvanBul } from "@/lib/kivilcim";

// MEZUNİYET ÖZETİ — kamp bitiş kutlamasının kişisel istatistik kartı için.
// "3 gün · N görev · X kıvılcım · ünvan". Salt okuma; hafif.
export async function GET() {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ hata: "oturum" }, { status: 401 });
  }
  const db = supabaseAdmin();
  const [{ data: puanlar }, { count: gorevSayisi }] = await Promise.all([
    db
      .from("missions")
      .select("spark_points")
      .eq("participant_id", session.sub)
      .eq("status", "scored"),
    db
      .from("missions")
      .select("id", { count: "exact", head: true })
      .eq("participant_id", session.sub)
      .eq("status", "scored"),
  ]);
  const kivilcim = (puanlar ?? []).reduce((t, g) => t + (g.spark_points ?? 0), 0);
  const unvan = unvanBul(kivilcim).mevcut.ad;
  return Response.json({
    ad: session.ad,
    gorevSayisi: gorevSayisi ?? 0,
    kivilcim,
    unvan,
    gun: 3,
  });
}
