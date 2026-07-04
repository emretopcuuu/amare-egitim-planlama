import { getSession } from "@/lib/auth/session";
import { aiLimitYaniti } from "@/lib/aiLimit";
import { sesYapilandirildiMi, sesYaziyaCevir } from "@/lib/eleven";
import { tr } from "@/lib/i18n/tr";

export const maxDuration = 30;
// 120 sn'lik opus/aac kayıt ~1-2 MB; 8 MB tavanı bol güvenlik payı bırakır.
const AZAMI_BAYT = 8 * 1024 * 1024;

// SESLE YAZ (Faz 2): istemcinin MediaRecorder kaydını ElevenLabs Scribe ile
// metne çevirir. Cihaz tanımasından isabetli ve her tarayıcıda çalışır.
// ElevenLabs yapılandırılmamışsa 503 döner — istemci telefon motoruna düşer.
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ hata: tr.ortak.oturumGerekli }, { status: 401 });
  }
  if (!sesYapilandirildiMi()) {
    return Response.json({ hata: tr.ses.hata.genel }, { status: 503 });
  }
  // Maliyet sigortası — AI uçlarıyla ortak pencere sayacı.
  const limit = await aiLimitYaniti(session.sub, "ses_yaz");
  if (limit) return limit;

  const form = await req.formData();
  const ses = form.get("ses");
  if (!(ses instanceof File) || ses.size === 0) {
    return Response.json({ hata: tr.ses.hata.genel }, { status: 400 });
  }
  if (ses.size > AZAMI_BAYT) {
    return Response.json({ hata: tr.ses.hata.genel }, { status: 413 });
  }

  try {
    const metin = await sesYaziyaCevir(ses, ses.name || "kayit.webm");
    return Response.json({ metin });
  } catch {
    // İstemci 503/502'de telefon motoruna geri düşer — sessiz zarif geri çekilme.
    return Response.json({ hata: tr.ses.hata.genel }, { status: 502 });
  }
}
