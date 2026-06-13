import { adminOturumu } from "@/lib/auth/admin";
import { supabaseAdmin } from "@/lib/supabase/server";
import { tr } from "@/lib/i18n/tr";

// Fotoğraf moderasyonu: büyük ekran herkese açık olduğundan onay şart.
// onayla → 'approved' (duvarda görünür), gizle → 'hidden' (dosya da silinir).
export async function POST(req: Request) {
  if (!(await adminOturumu())) {
    return Response.json({ hata: tr.admin.yetkisiz }, { status: 403 });
  }

  let govde: { id?: unknown; eylem?: unknown };
  try {
    govde = await req.json();
  } catch {
    return Response.json({ hata: tr.duvar.hata }, { status: 400 });
  }
  const id = govde.id;
  const eylem = govde.eylem;
  if (typeof id !== "string" || (eylem !== "onayla" && eylem !== "gizle")) {
    return Response.json({ hata: tr.duvar.hata }, { status: 400 });
  }

  const db = supabaseAdmin();

  if (eylem === "gizle") {
    // Gizlenen fotoğrafın dosyasını da depolamadan kaldır
    const { data: foto } = await db
      .from("photos")
      .select("path")
      .eq("id", id)
      .maybeSingle();
    if (foto?.path) {
      await db.storage.from("sesler").remove([foto.path]);
    }
  }

  const { error } = await db
    .from("photos")
    .update({ status: eylem === "onayla" ? "approved" : "hidden" })
    .eq("id", id);
  if (error) {
    return Response.json({ hata: tr.duvar.hata }, { status: 500 });
  }
  return Response.json({ ok: true });
}
