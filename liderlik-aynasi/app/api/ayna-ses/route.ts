import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { aynaSesId, seslendir, sesYapilandirildiMi } from "@/lib/eleven";
import { tr } from "@/lib/i18n/tr";
import { ADIMLAR } from "@/lib/degerler";

// AYNA SESİ — Beyaz listedeki replik + ses-moment metinlerini AYNA marka sesiyle
// (ElevenLabs) seslendirip mp3 döner. İçeriğe metin enjekte edilemez. Kişinin
// seçtiği erkek/kadın sese göre üretilir — bu yüzden özel (private) cache'lenir,
// eskisi gibi herkese ortak public/immutable cache VERİLEMEZ.
// Anahtar yoksa 503 → istemci sessiz+altyazı moduna düşer.
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
  mezuniyet: tr.aynaSesMomentleri.mezuniyet,
  ...DEGERLER_GIRIS,
};

export async function GET(req: Request) {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return new Response("oturum", { status: 401 });
  }
  const kod = new URL(req.url).searchParams.get("k") ?? "";
  const metin = REPLIK[kod];
  if (!metin) return new Response("bilinmeyen replik", { status: 404 });
  if (!sesYapilandirildiMi()) return new Response("ses kapalı", { status: 503 });
  try {
    const { data: kisi } = await supabaseAdmin()
      .from("participants")
      .select("ayna_ses")
      .eq("id", session.sub)
      .maybeSingle();
    const buf = await seslendir(aynaSesId(), metin);
    return new Response(buf, {
      headers: {
        "content-type": "audio/mpeg",
        // ÖNEMLİ: kişi ses tercihini (erkek/kadın) İSTEDİĞİ AN değiştirebilir —
        // "immutable"/uzun önbellek verirsek tarayıcı sunucuya hiç sormadan
        // eski sesi çalmaya devam eder (tercih değişikliği hiç yansımaz).
        // Kısa TTL: performans kazancı korunur ama değişiklik hızla yansır.
        "cache-control": "private, max-age=120",
      },
    });
  } catch {
    return new Response("seslendirme hatası", { status: 502 });
  }
}
