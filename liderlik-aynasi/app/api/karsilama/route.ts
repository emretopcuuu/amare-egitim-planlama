import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { aiLimitYaniti } from "@/lib/aiLimit";
import { aynaSesId, seslendir, sesYapilandirildiMi } from "@/lib/eleven";
import { tr } from "@/lib/i18n/tr";

// [E7] AYNA'NIN SESLİ KARŞILAMASI — kişi Ayna sesini seçtikten HEMEN sonra,
// seçilen sesle kısa kişisel karşılama: "Merhaba <ad>. Ben Aynan…".
// - Metin sabittir (yalnız ilk ad eklenir) → enjeksiyon yüzeyi yok.
// - Kişi başı bir kez: yalnız ses seçiminden sonraki kısa pencerede üretilir
//   (istemci de akışta tek kez çağırır) + aiLimit maliyet sigortası.
// - ElevenLabs anahtarı yoksa 503 → istemci sessizce atlar, akış bozulmaz.
const KARSILAMA_PENCERESI_MS = 10 * 60_000;

export async function GET() {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return new Response("oturum", { status: 401 });
  }
  if (!sesYapilandirildiMi()) return new Response("ses kapalı", { status: 503 });

  const db = supabaseAdmin();
  const { data: kisi } = await db
    .from("participants")
    .select("full_name, ayna_ses, ayna_ses_secildi_at")
    .eq("id", session.sub)
    .maybeSingle();
  if (!kisi?.ayna_ses_secildi_at) {
    return new Response("önce ses seç", { status: 403 });
  }
  // Karşılama yalnız seçim anının hemen ardından anlamlı — pencere dışında üretme.
  if (Date.now() - Date.parse(kisi.ayna_ses_secildi_at) > KARSILAMA_PENCERESI_MS) {
    return new Response("pencere kapalı", { status: 403 });
  }

  const limit = await aiLimitYaniti(session.sub, "karsilama");
  if (limit) return limit;

  const ilkAd = kisi.full_name.split(" ")[0];
  const cinsiyet = kisi.ayna_ses === "kadin" ? ("kadin" as const) : ("erkek" as const);
  try {
    const buf = await seslendir(aynaSesId(cinsiyet), tr.sesSecimi.karsilamaMetni(ilkAd));
    return new Response(buf, {
      headers: {
        "content-type": "audio/mpeg",
        // Kişiye özel içerik — paylaşımlı önbelleğe girmesin.
        "cache-control": "private, max-age=600",
      },
    });
  } catch {
    return new Response("seslendirme hatası", { status: 502 });
  }
}
