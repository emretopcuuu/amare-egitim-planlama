import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { gorevNetlestir } from "@/lib/ayna";
import { tr } from "@/lib/i18n/tr";

export const maxDuration = 60;

// A10 — "Bu görevi netleştir". Belirsiz görevde AYNA tek-iki cümlelik somut
// açıklama döndürür. Görevi değiştirmez, yalnız anlatır.
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
  const { data: gorev } = await db
    .from("missions")
    .select("title, body, kind, status")
    .eq("id", govde.gorevId)
    .eq("participant_id", session.sub)
    .maybeSingle();
  if (!gorev || gorev.status !== "pending") {
    return Response.json({ hata: tr.gorevler.hata }, { status: 409 });
  }

  const aciklama = await gorevNetlestir({
    title: gorev.title,
    body: gorev.body,
    kind: gorev.kind,
  });
  if (!aciklama) return Response.json({ hata: tr.gorevler.hata }, { status: 503 });
  return Response.json({ aciklama });
}
