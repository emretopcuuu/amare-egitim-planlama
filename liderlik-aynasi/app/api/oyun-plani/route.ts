import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { oyunPlaniGetirVeyaUret } from "@/lib/oyunPlani";
import { raporlarGorunurMu } from "@/lib/rapor";

// 10/40/90 oyun planı — rapor açıkken istek üzerine üretilir (mektup gibi).
export async function POST() {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ durum: "hata" }, { status: 401 });
  }
  const db = supabaseAdmin();
  if (!(await raporlarGorunurMu(db))) {
    return Response.json({ durum: "hata" }, { status: 403 });
  }
  const sonuc = await oyunPlaniGetirVeyaUret(db, session.sub);
  return Response.json(sonuc);
}
