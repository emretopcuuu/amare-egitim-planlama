import { getSession } from "@/lib/auth/session";
import { aynaSesId, seslendir, sesYapilandirildiMi } from "@/lib/eleven";

// AYNA SESİ SEÇİMİ önizlemesi — sabit, beyaz listedeki tek cümleyi istenen
// cinsiyette seslendirir (metin enjeksiyonu yok, yalnız ?ses=erkek|kadin kabul
// edilir). Kişi seçim yapmadan ÖNCE iki sesi de dinleyebilsin diye ayrı bir
// endpoint — /api/ayna-ses kişinin KAYITLI tercihini kullanır, önizlemeye uygun değil.
const ONIZLEME_METNI = "Merhaba, ben AYNA. Bu yolculukta seninle birlikteyim.";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return new Response("oturum", { status: 401 });
  }
  const ses = new URL(req.url).searchParams.get("ses");
  if (ses !== "erkek" && ses !== "kadin") {
    return new Response("geçersiz ses", { status: 400 });
  }
  if (!sesYapilandirildiMi()) return new Response("ses kapalı", { status: 503 });
  try {
    const buf = await seslendir(aynaSesId(ses), ONIZLEME_METNI);
    return new Response(buf, {
      headers: {
        "content-type": "audio/mpeg",
        // İçerik + ses sabit kombinasyon — herkes için aynı, uzun önbelleklenebilir.
        "cache-control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("seslendirme hatası", { status: 502 });
  }
}
