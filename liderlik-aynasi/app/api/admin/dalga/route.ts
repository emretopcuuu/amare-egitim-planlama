import { adminOturumu } from "@/lib/auth/admin";
import { supabaseAdmin } from "@/lib/supabase/server";
import { herkeseBildir } from "@/lib/push";
import { tr } from "@/lib/i18n/tr";

// Dalga aç/kapat. Aynı anda tek dalga açık kuralı burada uygulanır:
// bir dalgayı açmak, açık olan diğerlerini kapatır.
export async function POST(req: Request) {
  if (!(await adminOturumu())) {
    return Response.json({ hata: tr.admin.yetkisiz }, { status: 403 });
  }

  let govde: { dalgaId?: unknown; acik?: unknown };
  try {
    govde = await req.json();
  } catch {
    return Response.json({ hata: tr.admin.dalga.hata }, { status: 400 });
  }

  const { dalgaId, acik } = govde;
  if (typeof dalgaId !== "number" || typeof acik !== "boolean") {
    return Response.json({ hata: tr.admin.dalga.hata }, { status: 400 });
  }

  const db = supabaseAdmin();
  const simdi = new Date().toISOString();

  if (acik) {
    const { error: kapatmaHatasi } = await db
      .from("waves")
      .update({ is_open: false, closed_at: simdi })
      .eq("is_open", true)
      .neq("id", dalgaId);
    if (kapatmaHatasi) {
      return Response.json({ hata: tr.admin.dalga.hata }, { status: 500 });
    }
  }

  const { data, error } = await db
    .from("waves")
    .update(
      acik
        ? { is_open: true, opened_at: simdi, closed_at: null }
        : { is_open: false, closed_at: simdi }
    )
    .eq("id", dalgaId)
    .select("id, name")
    .maybeSingle();

  if (error || !data) {
    return Response.json({ hata: tr.admin.dalga.hata }, { status: error ? 500 : 404 });
  }

  if (acik) {
    // Sahne sinyali: /ekran önümüzdeki dakikalarda dalga sinematiğini oynatır
    await db.from("settings").upsert({
      key: "sahne_dalga",
      value: `${dalgaId}:${simdi}`,
      updated_at: simdi,
    });
    await herkeseBildir(
      db,
      `🌊 ${data.name} açıldı`,
      "Telefonu kap — gözlemlerini aynaya bırak.",
      "/degerlendir"
    );
  }

  return Response.json({ ok: true });
}
