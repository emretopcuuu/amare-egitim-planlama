import { adminOturumu } from "@/lib/auth/admin";
import { supabaseAdmin } from "@/lib/supabase/server";
import { tr } from "@/lib/i18n/tr";

// Ayna Anı düğmesi: reports_visible ayarını çevirir. true olduğu an
// bekleme ekranındaki tüm telefonlar bir sonraki yoklamada açılır.
export async function POST(req: Request) {
  if (!(await adminOturumu())) {
    return Response.json({ hata: tr.admin.yetkisiz }, { status: 403 });
  }

  let acik: unknown;
  try {
    ({ acik } = await req.json());
  } catch {
    return Response.json({ hata: tr.admin.aynaAni.hata }, { status: 400 });
  }
  if (typeof acik !== "boolean") {
    return Response.json({ hata: tr.admin.aynaAni.hata }, { status: 400 });
  }

  const { error } = await supabaseAdmin()
    .from("settings")
    .update({ value: String(acik), updated_at: new Date().toISOString() })
    .eq("key", "reports_visible");

  if (error) {
    return Response.json({ hata: tr.admin.aynaAni.hata }, { status: 500 });
  }
  return Response.json({ ok: true });
}
