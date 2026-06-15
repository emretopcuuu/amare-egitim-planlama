import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";

// Anı Duvarı: fotoğraf beğeni (kalp) aç/kapat.
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ hata: "Yetkisiz" }, { status: 401 });
  }
  const body = (await req.json().catch(() => null)) as { fotoId?: unknown } | null;
  const fotoId = typeof body?.fotoId === "string" ? body.fotoId : "";
  if (!fotoId) return Response.json({ hata: "Geçersiz" }, { status: 400 });

  const db = supabaseAdmin();
  const { data: mevcut } = await db
    .from("foto_begeni")
    .select("id")
    .eq("photo_id", fotoId)
    .eq("participant_id", session.sub)
    .maybeSingle();
  if (mevcut) {
    await db.from("foto_begeni").delete().eq("id", mevcut.id);
  } else {
    await db.from("foto_begeni").insert({ photo_id: fotoId, participant_id: session.sub });
  }
  const { count } = await db
    .from("foto_begeni")
    .select("id", { count: "exact", head: true })
    .eq("photo_id", fotoId);
  return Response.json({ begenildi: !mevcut, sayi: count ?? 0 });
}
