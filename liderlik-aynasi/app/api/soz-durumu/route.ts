import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { sozMuhurDurumu } from "@/lib/sozMuhur";

// [E3] Söz mühür durumu — canlı sayaç + senkron an yoklaması için. Katılımcı ya da
// admin okuyabilir (kimlik taşımaz, yalnız sayılar).
export async function GET() {
  const session = await getSession();
  if (!session) return Response.json({ hata: "Oturum gerekli" }, { status: 401 });
  const durum = await sozMuhurDurumu(supabaseAdmin());
  return Response.json(durum);
}
