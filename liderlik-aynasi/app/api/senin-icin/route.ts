import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { raporlarGorunurMu } from "@/lib/rapor";
import { seninIcinGetirVeyaUret } from "@/lib/seninIcin";
import { tr } from "@/lib/i18n/tr";

// "Senin İçin" üretimi birkaç saniye sürebilir.
export const maxDuration = 60;

// Katılımcı kendi "Senin İçin" metnini ister: varsa döner, yoksa üretilir.
// Raporlar görünür olmadan açılmaz (sürpriz bozulmasın).
export async function POST() {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ hata: tr.ortak.oturumGerekli }, { status: 401 });
  }

  const db = supabaseAdmin();
  if (!(await raporlarGorunurMu(db))) {
    return Response.json({ hata: tr.ayna.seninIcinHata }, { status: 409 });
  }

  const sonuc = await seninIcinGetirVeyaUret(db, session.sub, session.ad);
  if (sonuc.durum !== "hazir") {
    return Response.json({ hata: tr.ayna.seninIcinHata }, { status: 503 });
  }
  return Response.json({ metin: sonuc.metin });
}
