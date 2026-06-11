import { adminOturumu } from "@/lib/auth/admin";
import { supabaseAdmin } from "@/lib/supabase/server";
import { tr } from "@/lib/i18n/tr";

// Yorum gizle/göster: puan korunur, yalnızca yorum raporda görünmez olur
// (rapor sorguları is_hidden=false filtreler — Faz 4).
export async function POST(req: Request) {
  if (!(await adminOturumu())) {
    return Response.json({ hata: tr.admin.yetkisiz }, { status: 403 });
  }

  let govde: { puanId?: unknown; gizli?: unknown };
  try {
    govde = await req.json();
  } catch {
    return Response.json({ hata: tr.admin.moderasyon.hata }, { status: 400 });
  }

  const { puanId, gizli } = govde;
  if (typeof puanId !== "string" || typeof gizli !== "boolean") {
    return Response.json({ hata: tr.admin.moderasyon.hata }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin()
    .from("ratings")
    .update({ is_hidden: gizli })
    .eq("id", puanId)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return Response.json({ hata: tr.admin.moderasyon.hata }, { status: error ? 500 : 404 });
  }

  return Response.json({ ok: true });
}
