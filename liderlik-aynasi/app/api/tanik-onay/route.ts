import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { tr } from "@/lib/i18n/tr";

// GELİŞTİRME #5 — Tanık onayı. Tanık gösterilen kişi gözlemini yazar; kayıt
// onaylanır. Gözlem adaya ANONİM görünür (kim yazdığı gösterilmez).
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ hata: tr.ortak.oturumGerekli }, { status: 401 });
  }

  let govde: { tanikId?: unknown; gozlem?: unknown };
  try {
    govde = await req.json();
  } catch {
    return Response.json({ hata: tr.gorevler.hata }, { status: 400 });
  }
  const { tanikId, gozlem } = govde;
  if (typeof tanikId !== "string" || typeof gozlem !== "string" || gozlem.trim().length < 2) {
    return Response.json({ hata: tr.gorevler.hata }, { status: 400 });
  }

  const db = supabaseAdmin();
  // Yalnız bu kişiye gelen, henüz onaylanmamış tanıklığı işaretle.
  const { data, error } = await db
    .from("gorev_tanik")
    .update({ observation: gozlem.trim().slice(0, 400), confirmed_at: new Date().toISOString() })
    .eq("id", tanikId)
    .eq("witness_id", session.sub)
    .is("confirmed_at", null)
    .select("id")
    .maybeSingle();
  if (error || !data) return Response.json({ hata: tr.gorevler.hata }, { status: 409 });
  return Response.json({ ok: true });
}
