import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { fisiltiTahmin } from "@/lib/fisilti";

export const maxDuration = 20;

// G5 — "kim söyledi?" tahmini. Doğruysa ikisine kıvılcım + (izin varsa) kimlik.
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ hata: "Yetkisiz" }, { status: 401 });
  }
  const g = (await req.json().catch(() => ({}))) as { fisiltiId?: string; tahminId?: string };
  if (typeof g.fisiltiId !== "string" || typeof g.tahminId !== "string") {
    return Response.json({ hata: "Eksik" }, { status: 400 });
  }
  const db = supabaseAdmin();
  const sonuc = await fisiltiTahmin(db, session.sub, g.fisiltiId, g.tahminId);
  return Response.json({ ok: true, ...sonuc });
}
