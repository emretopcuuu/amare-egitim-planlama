import { adminOturumu } from "@/lib/auth/admin";
import { supabaseAdmin } from "@/lib/supabase/server";
import { grupOdevUret } from "@/lib/grupOdev";
import { tr } from "@/lib/i18n/tr";

export const maxDuration = 60;

// Admin: bir grup için AYNA grup ödevi üretir (grup-içi ya da grup-birlikte).
export async function POST(req: Request) {
  if (!(await adminOturumu())) {
    return Response.json({ hata: tr.admin.yetkisiz }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const takim = typeof body?.takim === "string" ? body.takim.trim() : "";
  const tip = body?.tip === "grup_birlikte" ? "grup_birlikte" : "grup_ici";
  if (!takim) {
    return Response.json({ hata: tr.admin.grupOdev.hata }, { status: 400 });
  }

  const sonuc = await grupOdevUret(supabaseAdmin(), takim, tip);
  if (!sonuc) {
    return Response.json({ hata: tr.admin.grupOdev.uretilemedi }, { status: 503 });
  }
  return Response.json({ ok: true, ...sonuc });
}
