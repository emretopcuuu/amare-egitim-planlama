import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { tr } from "@/lib/i18n/tr";

// [3.1] Kamp arkadaşı check-in: kişi "aradık/konuştuk" tek dokunuşu. Yalnız
// kendi grubuna yazılır; günde bir kez yeter (aynı gün ikinci dokunuş yok sayılır).
export async function POST() {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ hata: tr.ortak.oturumGerekli }, { status: 401 });
  }
  const db = supabaseAdmin();
  // Kişinin dahil olduğu grubu bul (uyeler dizisi içeriyorsa).
  const { data: gruplar } = await db.from("kamp_arkadasi").select("id, uyeler");
  const grup = (gruplar ?? []).find((g) => ((g.uyeler as string[]) ?? []).includes(session.sub));
  if (!grup) return Response.json({ hata: tr.ortak.genelHata }, { status: 404 });

  // Aynı gün tekrar check-in'i engelle.
  const gunBasi = new Date();
  gunBasi.setHours(0, 0, 0, 0);
  const { data: bugunku } = await db
    .from("kamp_arkadasi_checkin")
    .select("id")
    .eq("arkadaslik_id", grup.id)
    .eq("participant_id", session.sub)
    .gte("created_at", gunBasi.toISOString())
    .maybeSingle();
  if (bugunku) return Response.json({ ok: true, tekrar: true });

  const { error } = await db
    .from("kamp_arkadasi_checkin")
    .insert({ arkadaslik_id: grup.id, participant_id: session.sub });
  if (error) return Response.json({ hata: tr.ortak.genelHata }, { status: 500 });
  return Response.json({ ok: true });
}
