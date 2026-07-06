import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { ikinciAynaGetirVeyaUret } from "@/lib/ikinciAyna";
import { tr } from "@/lib/i18n/tr";

// 90. gün finali — üretim mektup.ts gibi saniyeler sürer, Vercel varsayılanına sığmayabilir.
export const maxDuration = 60;

// Katılımcı kendi İkinci Ayna'sını ister: varsa döner, yoksa üretilir.
// 90 gün penceresi (ikinci_ayna_acik) açılmadan üretilmez.
export async function POST() {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ hata: tr.ortak.oturumGerekli }, { status: 401 });
  }
  const db = supabaseAdmin();
  const { data: ayar } = await db.from("settings").select("value").eq("key", "ikinci_ayna_acik").maybeSingle();
  if (ayar?.value !== "true") {
    return Response.json({ hata: "kapali" }, { status: 409 });
  }
  const sonuc = await ikinciAynaGetirVeyaUret(db, session.sub, session.ad);
  if (sonuc.durum !== "hazir") {
    return Response.json({ hata: "uretilemedi" }, { status: 503 });
  }
  return Response.json({ icerik: sonuc.icerik });
}
