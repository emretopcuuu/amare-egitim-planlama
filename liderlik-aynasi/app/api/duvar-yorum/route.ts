import { getSession } from "@/lib/auth/session";
import { bayatOturumYaniti } from "@/lib/auth/bayatOturum";
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
  // İDEMPOTENSİ: çift dokunuş aynı yorumu iki kez yazmasın.
  const sonIkiDk = new Date(Date.now() - 2 * 60_000).toISOString();
  const { data: ayni } = await db
    .from("foto_yorum")
    .select("id")
    .eq("photo_id", fotoId)
    .eq("participant_id", session.sub)
    .eq("yorum", yorum)
    .gte("created_at", sonIkiDk)
    .limit(1);
  if (ayni && ayni.length > 0) return Response.json({ ok: true });

  const { error } = await db
    .from("foto_yorum")
    .insert({ photo_id: fotoId, participant_id: session.sub, yorum });
  if (error) {
    const bayat = await bayatOturumYaniti(error);
    if (bayat) return bayat;
    // Ham DB hata mesajını istemciye SIZDIRMA — jenerik mesaj yeter.
    return Response.json({ hata: "Kaydedilemedi, tekrar dene." }, { status: 500 });
  }
  return Response.json({ ok: true });
}
