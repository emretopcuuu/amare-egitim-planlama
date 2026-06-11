import { adminOturumu } from "@/lib/auth/admin";
import { supabaseAdmin } from "@/lib/supabase/server";
import { eslestir } from "@/lib/eslestirme";
import { tr } from "@/lib/i18n/tr";

// Eşleştirmeyi baştan kurar: mevcut TÜM atamalar silinir, algoritma yeniden
// çalışır. Dalga ortasında çalıştırmak gözlem listelerini değiştirir — UI bu
// konuda açıkça uyarır ve onay kutusu ister.
export async function POST(req: Request) {
  if (!(await adminOturumu())) {
    return Response.json({ hata: tr.admin.yetkisiz }, { status: 403 });
  }

  let govde: { gizli?: unknown; acik?: unknown };
  try {
    govde = await req.json();
  } catch {
    return Response.json({ hata: tr.admin.eslestirme.hataSunucu }, { status: 400 });
  }

  const { gizli, acik } = govde;
  if (
    typeof gizli !== "number" || typeof acik !== "number" ||
    !Number.isInteger(gizli) || !Number.isInteger(acik) ||
    gizli < 0 || gizli > 5 || acik < 0 || acik > 5 || gizli + acik < 1
  ) {
    return Response.json({ hata: tr.admin.eslestirme.hataSunucu }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data: kisiler, error } = await db
    .from("participants")
    .select("id, team")
    .eq("role", "participant");
  if (error) {
    return Response.json({ hata: tr.admin.eslestirme.hataSunucu }, { status: 500 });
  }
  if (kisiler.length < 2) {
    return Response.json({ hata: tr.admin.eslestirme.hataAzKisi }, { status: 400 });
  }

  const atamalar = eslestir(kisiler, gizli, acik);

  const { error: silmeHatasi } = await db
    .from("assignments")
    .delete()
    .gte("created_at", "1970-01-01"); // koşulsuz delete'i Supabase reddeder
  if (silmeHatasi) {
    return Response.json({ hata: tr.admin.eslestirme.hataSunucu }, { status: 500 });
  }

  const { error: yazmaHatasi } = await db.from("assignments").insert(atamalar);
  if (yazmaHatasi) {
    return Response.json({ hata: tr.admin.eslestirme.hataSunucu }, { status: 500 });
  }

  return Response.json({ atamaSayisi: atamalar.length });
}
