import { adminOturumu } from "@/lib/auth/admin";
import { supabaseAdmin } from "@/lib/supabase/server";
import { yazAuditLog } from "@/lib/auditLog";
import { tr } from "@/lib/i18n/tr";

// Ayna Anı düğmesi: reports_visible ayarını çevirir. true olduğu an
// bekleme ekranındaki tüm telefonlar bir sonraki yoklamada açılır.
export async function POST(req: Request) {
  const session = await adminOturumu();
  if (!session) {
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

  const db = supabaseAdmin();
  const { error } = await db
    .from("settings")
    .update({ value: String(acik), updated_at: new Date().toISOString() })
    .eq("key", "reports_visible");

  if (error) {
    return Response.json({ hata: tr.admin.aynaAni.hata }, { status: 500 });
  }

  await yazAuditLog(
    db,
    session.sub,
    acik ? "rapor_acildi" : "rapor_kapatildi",
    {},
    req as import("next/server").NextRequest
  );

  return Response.json({ ok: true });
}
