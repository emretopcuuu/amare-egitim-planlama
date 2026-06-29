import { adminOturumu } from "@/lib/auth/admin";
import { supabaseAdmin } from "@/lib/supabase/server";
import { eslestirEkle } from "@/lib/eslestirme";
import { tr } from "@/lib/i18n/tr";

// Artımlı eşleştirme: mevcut atamalara dokunmaz, yalnızca hedef sayısının
// altında kalan kişileri (yeni katılımcılar dahil) tamamlar.
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
  const [{ data: kisiler, error }, { data: mevcutAtamalar }, { data: dislananlar }] =
    await Promise.all([
      db.from("participants").select("id, team").eq("role", "participant"),
      db.from("assignments").select("observer_id, target_id").eq("type", "shadow"),
      db.from("excluded_pairs").select("a_id, b_id"),
    ]);

  if (error) {
    return Response.json({ hata: tr.admin.eslestirme.hataSunucu }, { status: 500 });
  }
  if ((kisiler ?? []).length < 2) {
    return Response.json({ hata: tr.admin.eslestirme.hataAzKisi }, { status: 400 });
  }

  const dislamaSet = new Set<string>(
    (dislananlar ?? []).map((d) => `${d.a_id}|${d.b_id}`)
  );

  const yeniAtamalar = eslestirEkle(
    kisiler ?? [],
    mevcutAtamalar ?? [],
    grupIci,
    grupDisi,
    Math.random,
    dislamaSet
  );

  if (yeniAtamalar.length === 0) {
    return Response.json({ atamaSayisi: 0, mesaj: tr.admin.eslestirme.ekleYeniYok });
  }

  const { error: yazHata } = await db.from("assignments").insert(yeniAtamalar);
  if (yazHata) {
    return Response.json({ hata: tr.admin.eslestirme.hataSunucu }, { status: 500 });
  }

  return Response.json({ atamaSayisi: yeniAtamalar.length });
}
