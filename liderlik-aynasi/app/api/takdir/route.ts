import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { tr } from "@/lib/i18n/tr";

const MESAJ_MAX = 280;

// TAKDİR GÖNDER: bir kişiye kısa pozitif not. Puandan farklı — daima isimli,
// daima olumlu. Sunucu hedefin gerçek katılımcı olduğunu doğrular.
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return Response.json({ hata: tr.ortak.oturumGerekli }, { status: 401 });
  }
  if (session.rol !== "participant") {
    return Response.json({ hata: tr.takdir.hata }, { status: 403 });
  }

  let govde: { hedefId?: unknown; mesaj?: unknown };
  try {
    govde = await req.json();
  } catch {
    return Response.json({ hata: tr.takdir.hata }, { status: 400 });
  }

  const hedefId = govde.hedefId;
  const mesaj = typeof govde.mesaj === "string" ? govde.mesaj.trim().slice(0, MESAJ_MAX) : "";
  if (typeof hedefId !== "string" || hedefId === session.sub || mesaj.length < 2) {
    return Response.json({ hata: tr.takdir.hata }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data: hedef } = await db
    .from("participants")
    .select("id")
    .eq("id", hedefId)
    .eq("role", "participant")
    .maybeSingle();
  if (!hedef) {
    return Response.json({ hata: tr.takdir.hata }, { status: 404 });
  }

  const { error } = await db.from("kudos").insert({
    from_id: session.sub,
    to_id: hedefId,
    message: mesaj,
  });
  if (error) {
    return Response.json({ hata: tr.takdir.hata }, { status: 500 });
  }
  return Response.json({ ok: true });
}
