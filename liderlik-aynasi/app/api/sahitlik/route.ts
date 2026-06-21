import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { takipEttiklerim, durtmeGonder } from "@/lib/sozTakip";

// Şahit paneli — GET: şahit olunan kişiler + ilerlemeleri. POST: dürtme gönder.
export async function GET() {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ hata: "yetkisiz" }, { status: 401 });
  }
  const db = supabaseAdmin();
  const kisiler = await takipEttiklerim(db, session.sub);
  return Response.json({ kisiler });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ hata: "yetkisiz" }, { status: 401 });
  }
  let g: { sahibi?: unknown; tip?: unknown; mesaj?: unknown };
  try {
    g = await req.json();
  } catch {
    return Response.json({ hata: "geçersiz" }, { status: 400 });
  }
  if (typeof g.sahibi !== "string" || typeof g.tip !== "string") {
    return Response.json({ hata: "geçersiz" }, { status: 400 });
  }
  const db = supabaseAdmin();
  // Yetki: yalnız gerçekten şahit olunan kişiye dürtme gönderilebilir.
  const { data: tanik } = await db
    .from("soz_tanik")
    .select("id")
    .eq("soz_sahibi", g.sahibi)
    .eq("witness_id", session.sub)
    .maybeSingle();
  if (!tanik) return Response.json({ hata: "yetkisiz" }, { status: 403 });

  await durtmeGonder(
    db,
    g.sahibi,
    session.sub,
    g.tip,
    typeof g.mesaj === "string" ? g.mesaj : null,
    session.ad.split(" ")[0]
  );
  return Response.json({ ok: true });
}
