import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { fisiltiDinle } from "@/lib/fisilti";

export const maxDuration = 20;

// G5 — fısıltıyı dinlendi işaretle + (anonimse) "kim söyledi?" şıklarını döndür.
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ hata: "Yetkisiz" }, { status: 401 });
  }
  const g = (await req.json().catch(() => ({}))) as { fisiltiId?: string };
  if (typeof g.fisiltiId !== "string") return Response.json({ hata: "Eksik" }, { status: 400 });
  const db = supabaseAdmin();
  const sonuc = await fisiltiDinle(db, session.sub, g.fisiltiId);
  if (!sonuc.ok) return Response.json({ hata: "Bulunamadı" }, { status: 400 });
  return Response.json({ ok: true, secenekler: sonuc.secenekler ?? null });
}
