import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { raporlarGorunurMu } from "@/lib/rapor";
import { tekCumleGetirVeyaUret } from "@/lib/aynaTekCumle";
import { tr } from "@/lib/i18n/tr";

// AYNA'nın Tek Cümlesi üretimi birkaç saniye sürebilir.
export const maxDuration = 60;

// Katılımcı kendi tek cümlesini ister: varsa döner, yoksa üretilir.
// Raporlar görünür olmadan açılmaz (sürpriz bozulmasın).
export async function POST() {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ hata: tr.ortak.oturumGerekli }, { status: 401 });
  }

  const db = supabaseAdmin();
  if (!(await raporlarGorunurMu(db))) {
    return Response.json({ hata: tr.ayna.tekCumleHata }, { status: 409 });
  }

  const sonuc = await tekCumleGetirVeyaUret(db, session.sub, session.ad);
  if (sonuc.durum !== "hazir") {
    return Response.json({ hata: tr.ayna.tekCumleHata }, { status: 503 });
  }
  return Response.json({ cumle: sonuc.cumle });
}
