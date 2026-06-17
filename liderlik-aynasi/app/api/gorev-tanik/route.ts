import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { katilimciyaBildir } from "@/lib/push";
import { tr } from "@/lib/i18n/tr";

// GELİŞTİRME #5 — Tanık gösterme. Aday tamamladığı bir göreve bir ekip
// arkadaşını tanık gösterir; o kişiye bildirim gider ve gözlemini ister.
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ hata: tr.ortak.oturumGerekli }, { status: 401 });
  }

  let govde: { gorevId?: unknown; tanikId?: unknown };
  try {
    govde = await req.json();
  } catch {
    return Response.json({ hata: tr.gorevler.hata }, { status: 400 });
  }
  const { gorevId, tanikId } = govde;
  if (typeof gorevId !== "string" || typeof tanikId !== "string" || tanikId === session.sub) {
    return Response.json({ hata: tr.gorevler.hata }, { status: 400 });
  }

  const db = supabaseAdmin();
  // Görev gerçekten bu adaya mı ait ve tamamlandı mı?
  const { data: gorev } = await db
    .from("missions")
    .select("id, title, status")
    .eq("id", gorevId)
    .eq("participant_id", session.sub)
    .maybeSingle();
  if (!gorev || (gorev.status !== "scored" && gorev.status !== "submitted")) {
    return Response.json({ hata: tr.gorevler.hata }, { status: 409 });
  }
  // Tanık geçerli bir katılımcı mı?
  const { data: tanik } = await db
    .from("participants")
    .select("id")
    .eq("id", tanikId)
    .eq("role", "participant")
    .maybeSingle();
  if (!tanik) return Response.json({ hata: tr.gorevler.hata }, { status: 400 });

  // Görev başına tek tanık (mission_id unique) — varsa güncelle.
  const { error } = await db
    .from("gorev_tanik")
    .upsert(
      { mission_id: gorevId, doer_id: session.sub, witness_id: tanikId },
      { onConflict: "mission_id" }
    );
  if (error) return Response.json({ hata: tr.gorevler.hata }, { status: 500 });

  await katilimciyaBildir(
    db,
    tanikId,
    tr.gorevler.tanikBildirimBaslik,
    tr.gorevler.tanikBildirimGovde(session.ad.split(" ")[0]),
    "/gorevler"
  );
  return Response.json({ ok: true });
}
