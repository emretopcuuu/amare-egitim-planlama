import { aynaSesId, seslendir, sesYapilandirildiMi } from "@/lib/eleven";
import { tr } from "@/lib/i18n/tr";
import { ADIMLAR } from "@/lib/degerler";

// AYNA SESİ — Beyaz listedeki replik + ses-moment metinlerini AYNA marka sesiyle
// (ElevenLabs) seslendirip mp3 döner. İçeriğe metin enjekte edilemez.
// Anahtar yoksa 503 → istemci sessiz+altyazı moduna düşer.
// Güçlü cache: aynı replik bir daha üretilmesin (CDN/tarayıcı).
const DEGERLER_GIRIS: Record<string, string> = {};
for (const adim of ADIMLAR) {
  if (adim.tip === "intro") {
    DEGERLER_GIRIS[`degerler_${adim.kod}`] = `${adim.baslik}. ${adim.paragraf}`;
  }
}

const REPLIK: Record<string, string> = {
  ...tr.pusulaAcilis.replik,
  rituelGiris: tr.aynaSesMomentleri.rituelGiris,
  raporAcilis: tr.aynaSesMomentleri.raporAcilis,
  ...DEGERLER_GIRIS,
};

export async function GET(req: Request) {
  const kod = new URL(req.url).searchParams.get("k") ?? "";
  const metin = REPLIK[kod];
  if (!metin) return new Response("bilinmeyen replik", { status: 404 });
  if (!sesYapilandirildiMi()) return new Response("ses kapalı", { status: 503 });
  try {
    const buf = await seslendir(aynaSesId(), metin);
    return new Response(buf, {
      headers: {
        "content-type": "audio/mpeg",
        "cache-control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("seslendirme hatası", { status: 502 });
  }
}
