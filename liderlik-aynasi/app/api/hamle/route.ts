import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { hamleYanitla } from "@/lib/hamle";

export const maxDuration = 20;

// G6 — hamle sırası: B kendi tarafını yazar → karşılıklı reveal + kıvılcım.
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ hata: "Yetkisiz" }, { status: 401 });
  }
  const g = (await req.json().catch(() => ({}))) as { hamleId?: string; cumle?: string };
  if (typeof g.hamleId !== "string" || typeof g.cumle !== "string") {
    return Response.json({ hata: "Eksik" }, { status: 400 });
  }
  const db = supabaseAdmin();
  const sonuc = await hamleYanitla(db, session.sub, g.hamleId, g.cumle);
  if (!sonuc.ok) return Response.json({ hata: "Yanıtlanamadı." }, { status: 400 });
  return Response.json({ ok: true, karsiCumle: sonuc.karsiCumle ?? null });
}
