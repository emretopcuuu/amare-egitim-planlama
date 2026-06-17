import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { tr } from "@/lib/i18n/tr";

// GELİŞTİRME #9 — Taahhüt köprüsü. Aday görevin yansımasını 90 günlük planına
// taşır (carried_at). Yansıma yazılmış olmalı.
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
  const { data, error } = await db
    .from("missions")
    .update({ carried_at: new Date().toISOString() })
    .eq("id", govde.gorevId)
    .eq("participant_id", session.sub)
    .not("reflection_text", "is", null)
    .select("id")
    .maybeSingle();
  if (error || !data) return Response.json({ hata: tr.gorevler.hata }, { status: 409 });
  return Response.json({ ok: true });
}
