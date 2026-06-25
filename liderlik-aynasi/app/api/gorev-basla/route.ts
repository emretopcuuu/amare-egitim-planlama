import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { tr } from "@/lib/i18n/tr";

// UX #1 — "Başladım". Saha görevleri (mentor konuşması, zor konuşma) gerçek
// zaman alır. Kişi "başladım" deyince started_at işaretlenir: sayaç sakinleşir
// ve AYNA "umursamadı" ile "uğraşıyor"u ayırabilir. Görevi puanlamaz/kapatmaz.
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ hata: tr.ortak.oturumGerekli }, { status: 401 });
  }

  let govde: { gorevId?: unknown };
  try {
    govde = await req.json();
  } catch {
    return Response.json({ hata: tr.gorevler.hata }, { status: 400 });
  }
  if (typeof govde.gorevId !== "string") {
    return Response.json({ hata: tr.gorevler.hata }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { error } = await db
    .from("missions")
    .update({ started_at: new Date().toISOString() })
    .eq("id", govde.gorevId)
    .eq("participant_id", session.sub)
    .eq("status", "pending")
    .is("started_at", null);

  if (error) return Response.json({ hata: tr.gorevler.hata }, { status: 500 });
  return Response.json({ ok: true });
}
