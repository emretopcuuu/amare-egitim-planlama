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

  let govde: { grupIci?: unknown; grupDisi?: unknown };
  try {
    govde = await req.json();
  } catch {
    return Response.json({ hata: tr.admin.eslestirme.hataSunucu }, { status: 400 });
  }

  const { grupIci, grupDisi } = govde;
  if (
    typeof grupIci !== "number" || typeof grupDisi !== "number" ||
    !Number.isInteger(grupIci) || !Number.isInteger(grupDisi) ||
    grupIci < 0 || grupIci > 15 || grupDisi < 0 || grupDisi > 15 || grupIci + grupDisi < 1
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

  const atamalar = eslestir(kisiler, grupIci, grupDisi);

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
