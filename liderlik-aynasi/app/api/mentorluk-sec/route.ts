import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { tr } from "@/lib/i18n/tr";

// #9 — Katılımcı önerilen 3 mentordan birini seçer (yapılandırılmış kayıt).
// Yalnız kendi mentorluk görevindeki adaylardan biri seçilebilir.
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ hata: tr.ortak.oturumGerekli }, { status: 401 });
  }
  let govde: { missionId?: unknown; mentorId?: unknown };
  try {
    govde = await req.json();
  } catch {
    return Response.json({ hata: tr.gorevler.hata }, { status: 400 });
  }
  if (typeof govde.missionId !== "string" || typeof govde.mentorId !== "string") {
    return Response.json({ hata: tr.gorevler.hata }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data: kayit } = await db
    .from("mentorluk_kayit")
    .select("id, aday_idler")
    .eq("mission_id", govde.missionId)
    .eq("mentee_id", session.sub)
    .maybeSingle();
  if (!kayit) return Response.json({ hata: tr.gorevler.hata }, { status: 404 });
  // Seçilen kişi gerçekten önerilen adaylardan biri olmalı.
  if (!(kayit.aday_idler as string[]).includes(govde.mentorId)) {
    return Response.json({ hata: tr.gorevler.hata }, { status: 400 });
  }

  const { error } = await db
    .from("mentorluk_kayit")
    .update({ secilen_id: govde.mentorId, updated_at: new Date().toISOString() })
    .eq("id", kayit.id);
  if (error) return Response.json({ hata: tr.gorevler.hata }, { status: 500 });
  return Response.json({ ok: true });
}
