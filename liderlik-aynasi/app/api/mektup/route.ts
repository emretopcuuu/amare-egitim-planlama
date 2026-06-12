import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { raporlarGorunurMu } from "@/lib/rapor";
import { mektupGetirVeyaUret } from "@/lib/mektup";
import { mektupSeslendir } from "@/lib/yansima";
import { tr } from "@/lib/i18n/tr";

// Mektup üretimi dakikalar değil ama saniyeler sürer; Vercel varsayılan
// süresine sığmayabilir.
export const maxDuration = 60;

// Katılımcı kendi mektubunu ister: varsa döner, yoksa üretilir.
// Raporlar görünür olmadan mektup açılmaz (sürpriz bozulmasın).
export async function POST() {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ hata: tr.ortak.oturumGerekli }, { status: 401 });
  }

  const db = supabaseAdmin();
  if (!(await raporlarGorunurMu(db))) {
    return Response.json({ hata: tr.mektup.hata }, { status: 409 });
  }

  const sonuc = await mektupGetirVeyaUret(db, session.sub, session.ad);
  if (sonuc.durum !== "hazir") {
    return Response.json({ hata: tr.mektup.hata }, { status: 503 });
  }
  // YANSIMAN: klonu hazırsa mektup kendi sesinden de dinlenir (idempotent)
  await mektupSeslendir(db, session.sub, sonuc.icerik);
  return Response.json({ mektup: sonuc.icerik });
}
