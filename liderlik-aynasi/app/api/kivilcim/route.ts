import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { unvanBul } from "@/lib/kivilcim";
import { acikDalga } from "@/lib/degerlendirme";

// Katılımcının toplam Kıvılcımı + unvan ilerlemesi — kalıcı üst/alt şerit için.
// B1: dalgaAcik de döner — alt çubuk "Değerlendir" sekmesini bağlama göre çevirsin.
export async function GET() {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ toplam: 0 }, { status: 401 });
  }
  const db = supabaseAdmin();
  const [{ data }, dalga, { count: gorevBekleyen }] = await Promise.all([
    db
      .from("missions")
      .select("spark_points")
      .eq("participant_id", session.sub)
      .eq("status", "scored"),
    acikDalga(db),
    // Bekleyen görev sayısı — alt çubukta "Görevler" sekmesi nokta rozetiyle
    // görevi her ekranda öne çeksin (görev her zaman birincil).
    db
      .from("missions")
      .select("id", { count: "exact", head: true })
      .eq("participant_id", session.sub)
      .eq("status", "pending"),
  ]);
  const toplam = (data ?? []).reduce((t, g) => t + (g.spark_points ?? 0), 0);
  const u = unvanBul(toplam);
  return Response.json({
    toplam,
    unvan: u.mevcut.ad,
    sonraki: u.sonraki?.ad ?? null,
    kalan: u.kalan,
    yuzde: u.sonraki ? Math.min(100, Math.round((toplam / u.sonraki.esik) * 100)) : 100,
    dalgaAcik: !!dalga,
    gorevBekleyen: gorevBekleyen ?? 0,
  });
}
