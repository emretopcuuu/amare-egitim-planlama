import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { raporlarGorunurMu } from "@/lib/rapor";
import { gelisimMektubuGetirVeyaUret } from "@/lib/gelisimMektubu";
import { tr } from "@/lib/i18n/tr";

// Gelişim (tavsiye) mektubu üretimi opus + thinking → saniyeler sürebilir.
export const maxDuration = 60;

// Katılımcı kendi gelişim mektubunu ister: varsa döner, yoksa sentezden üretilir.
// Raporlar görünür olmadan açılmaz (kapanış sürprizi bozulmasın).
export async function POST() {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ hata: tr.ortak.oturumGerekli }, { status: 401 });
  }

  const db = supabaseAdmin();
  if (!(await raporlarGorunurMu(db))) {
    return Response.json({ hata: "Henüz erken." }, { status: 409 });
  }

  const sonuc = await gelisimMektubuGetirVeyaUret(db, session.sub, session.ad);
  if (sonuc.durum === "veri-yok") {
    // Değerler çalışması yapılmamış — mektubun çıpası yok; sessizce boş dön.
    return Response.json({ mektup: null, yok: true });
  }
  if (sonuc.durum !== "hazir") {
    return Response.json({ hata: "Mektup şu an üretilemedi." }, { status: 503 });
  }
  return Response.json({ mektup: sonuc.mektup, ozet: sonuc.ozet });
}
