import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { gorevHafiflet } from "@/lib/ayna";
import type { Zorluk } from "@/lib/davranis";
import { tr } from "@/lib/i18n/tr";

export const maxDuration = 60;

// GELİŞTİRME #8 — "Bu bana ağır geldi". Aday görevi fazla bulunca AYNA şefkatle
// daha küçük bir varyant verir; lightened_at sonraki görevleri bir süre nazik tutar.
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
    .select("id, kind, title, body, status, difficulty")
    .eq("id", govde.gorevId)
    .eq("participant_id", session.sub)
    .maybeSingle();
  if (!gorev || gorev.status !== "pending") {
    return Response.json({ hata: tr.gorevler.hata }, { status: 409 });
  }
  if (gorev.kind === "soz" || gorev.kind === "senkron") {
    return Response.json({ hata: tr.gorevler.hata }, { status: 409 });
  }

  const yeniZorluk = Math.max(1, (gorev.difficulty ?? 2) - 1) as Zorluk;
  const yeni = await gorevHafiflet(
    { title: gorev.title, body: gorev.body, kind: gorev.kind },
    yeniZorluk
  );
  if (!yeni) return Response.json({ hata: tr.gorevler.hata }, { status: 503 });

  await db
    .from("missions")
    .update({
      title: yeni.title,
      body: yeni.body,
      difficulty: yeniZorluk,
      lightened_at: new Date().toISOString(),
    })
    .eq("id", gorev.id)
    .eq("status", "pending");

  return Response.json({ ok: true });
}
