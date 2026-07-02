import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { jetonlariUret } from "@/lib/eylulDis";

// [E11] Katılımcı, dış değerlendirme jetonlarını (en çok 3) üretir/getirir.
export async function POST() {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ hata: "Oturum gerekli" }, { status: 401 });
  }
  const tokenlar = await jetonlariUret(supabaseAdmin(), session.sub);
  return Response.json({ tokenlar });
}
