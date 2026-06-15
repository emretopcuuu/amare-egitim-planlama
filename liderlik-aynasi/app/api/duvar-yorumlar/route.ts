import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";

// Anı Duvarı: bir fotoğrafın yorumlarını getir (gönderen ad + avatar ile).
export async function GET(req: Request) {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ yorumlar: [] }, { status: 401 });
  }
  const fotoId = new URL(req.url).searchParams.get("fotoId") ?? "";
  if (!fotoId) return Response.json({ yorumlar: [] });

  const db = supabaseAdmin();
  const { data } = await db
    .from("foto_yorum")
    .select(
      "id, yorum, created_at, kisi:participants!foto_yorum_participant_id_fkey(full_name, profil_foto_path)"
    )
    .eq("photo_id", fotoId)
    .eq("is_hidden", false)
    .order("created_at", { ascending: true })
    .limit(200);

  const yollar = [
    ...new Set(
      (data ?? [])
        .map((y) => y.kisi?.profil_foto_path)
        .filter((p): p is string => !!p)
    ),
  ];
  const fotoUrl = new Map<string, string>();
  if (yollar.length > 0) {
    const { data: imzali } = await db.storage.from("sesler").createSignedUrls(yollar, 3600);
    for (const im of imzali ?? []) if (im.path && im.signedUrl) fotoUrl.set(im.path, im.signedUrl);
  }

  const yorumlar = (data ?? []).map((y) => ({
    id: y.id,
    yorum: y.yorum,
    ad: y.kisi?.full_name ?? "—",
    avatar: y.kisi?.profil_foto_path ? fotoUrl.get(y.kisi.profil_foto_path) ?? null : null,
  }));
  return Response.json({ yorumlar });
}
