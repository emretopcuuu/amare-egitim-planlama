import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { aynaAniUret } from "@/lib/ayna";
import { tr } from "@/lib/i18n/tr";

export const maxDuration = 60;

// GELİŞTİRME #3 — Ayna Anı. GET: kişinin görülmemiş anını döndür; yoksa ve
// koşullar tutuyorsa bir kez üretip mühürle. POST: anı "görüldü" işaretle.
export async function GET() {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ hata: tr.ortak.oturumGerekli }, { status: 401 });
  }
  const db = supabaseAdmin();

  const { data: mevcut } = await db
    .from("mirror_moments")
    .select("id, body, seen_at")
    .eq("participant_id", session.sub)
    .maybeSingle();

  if (mevcut) {
    // Görülmüşse tekrar gösterme (tek seferlik içgörü anı).
    return Response.json({ an: mevcut.seen_at ? null : mevcut.body });
  }

  // Henüz yok → koşullar tutuyorsa üret (kişi başına bir kez).
  const govde = await aynaAniUret(db, { id: session.sub, full_name: session.ad });
  if (!govde) return Response.json({ an: null });

  // Yarış durumunda çift üretimi engelle: unique participant_id ile upsert.
  const { data: yazilan } = await db
    .from("mirror_moments")
    .upsert({ participant_id: session.sub, body: govde }, { onConflict: "participant_id", ignoreDuplicates: true })
    .select("body")
    .maybeSingle();

  return Response.json({ an: yazilan?.body ?? govde });
}

export async function POST() {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ hata: tr.ortak.oturumGerekli }, { status: 401 });
  }
  const db = supabaseAdmin();
  await db
    .from("mirror_moments")
    .update({ seen_at: new Date().toISOString() })
    .eq("participant_id", session.sub)
    .is("seen_at", null);
  return Response.json({ ok: true });
}
