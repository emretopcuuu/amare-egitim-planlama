import { getSession } from "@/lib/auth/session";
import { aiLimitYaniti } from "@/lib/aiLimit";
import { aynaSesId, seslendir, sesYapilandirildiMi } from "@/lib/eleven";
import { tr } from "@/lib/i18n/tr";

export const maxDuration = 30;

// UX paketi #4 — Koçu'nun sesli modu artık AYNA'nın RESMÎ sesiyle konuşur
// (tarayıcının robotik TTS'i tek-ses karakter kararıyla çelişiyordu).
// Yalnız kişi sesli modu açıp bir yanıt geldiğinde çağrılır; 503/hata
// durumunda istemci tarayıcı TTS'ine zarifçe geri düşer (ses hiç susmaz).
const AZAMI_KARAKTER = 600; // maliyet tavanı: koç yanıtları zaten kısa (3-4 cümle)

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ hata: tr.ortak.oturumGerekli }, { status: 401 });
  }
  if (!sesYapilandirildiMi()) {
    return Response.json({ hata: "ses yok" }, { status: 503 });
  }
  // Maliyet sigortası — AI uçlarıyla ortak pencere sayacı.
  const limit = await aiLimitYaniti(session.sub, "kocu_ses");
  if (limit) return limit;

  const body = (await req.json().catch(() => null)) as { metin?: unknown } | null;
  const metin = typeof body?.metin === "string" ? body.metin.trim().slice(0, AZAMI_KARAKTER) : "";
  if (metin.length < 2) {
    return Response.json({ hata: "metin gerekli" }, { status: 400 });
  }

  try {
    const buf = await seslendir(aynaSesId(), metin);
    return new Response(buf, {
      headers: {
        "content-type": "audio/mpeg",
        "cache-control": "no-store",
      },
    });
  } catch {
    // İstemci tarayıcı TTS'ine düşer — sessiz zarif geri çekilme.
    return Response.json({ hata: "uretilemedi" }, { status: 502 });
  }
}
