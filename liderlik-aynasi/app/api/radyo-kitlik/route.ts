import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { radyoKitlikAcikMi, kitlikYayini } from "@/lib/kampRadyosu";

export const maxDuration = 15;

// G7 — canlı radyo penceresi: bayrak açık + yayına ≤5 dk önce geçmiş yayın varsa
// döndürür (yoksa null → kart kaybolur). İstemci ~30 sn poll eder.
export async function GET() {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ yayin: null }, { status: 401 });
  }
  const db = supabaseAdmin();
  if (!(await radyoKitlikAcikMi(db))) return Response.json({ yayin: null });
  const yayin = await kitlikYayini(db, new Date());
  return Response.json({ yayin });
}
