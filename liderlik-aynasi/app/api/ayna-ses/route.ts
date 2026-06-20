import { aynaSesId, seslendir, sesYapilandirildiMi } from "@/lib/eleven";
import { tr } from "@/lib/i18n/tr";

// AYNA SESİ — Pusula açılışının sabit repliklerini AYNA marka sesiyle (ElevenLabs)
// seslendirip mp3 döner. Yalnız beyaz listedeki replik kodları kabul edilir
// (içeriğe metin enjekte edilemez). Anahtar yoksa 503 → istemci sessiz+altyazı
// moduna düşer. Güçlü cache: aynı replik bir daha üretilmesin (CDN/tarayıcı).
const REPLIK = tr.pusulaAcilis.replik;

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
