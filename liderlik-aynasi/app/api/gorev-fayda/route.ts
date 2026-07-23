import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";

// [E#39] GÖREV FAYDASI OYU — kişi tamamladığı görevine "işine yaradı mı?" der.
// Yalnız KENDİ görevini oylayabilir. Oy görev üretimini besler (lib/ayna.ts).
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ hata: "yetkisiz" }, { status: 401 });
  }
  let g: { gorevId?: unknown; yararli?: unknown };
  try {
    g = await req.json();
  } catch {
    return Response.json({ hata: "geçersiz" }, { status: 400 });
  }
  if (typeof g.gorevId !== "string" || typeof g.yararli !== "boolean") {
    return Response.json({ hata: "geçersiz" }, { status: 400 });
  }
  const db = supabaseAdmin();
  const { error } = await db
    .from("missions")
    .update({ yararli: g.yararli })
    .eq("id", g.gorevId)
    .eq("participant_id", session.sub);
  return Response.json({ ok: !error });
}
