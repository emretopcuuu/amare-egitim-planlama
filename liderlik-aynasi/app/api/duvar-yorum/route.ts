import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";

// Anı Duvarı: fotoğrafa kısa yorum ekle.
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ hata: "Yetkisiz" }, { status: 401 });
  }
  const body = (await req.json().catch(() => null)) as
    | { fotoId?: unknown; yorum?: unknown }
    | null;
  const fotoId = typeof body?.fotoId === "string" ? body.fotoId : "";
  const yorum = typeof body?.yorum === "string" ? body.yorum.trim().slice(0, 280) : "";
  if (!fotoId || yorum.length < 1) {
    return Response.json({ hata: "Geçersiz" }, { status: 400 });
  }
  const db = supabaseAdmin();
  const { error } = await db
    .from("foto_yorum")
    .insert({ photo_id: fotoId, participant_id: session.sub, yorum });
  if (error) return Response.json({ hata: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
