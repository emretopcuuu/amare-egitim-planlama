import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { aynaSesId, seslendir, sesYapilandirildiMi } from "@/lib/eleven";
import { tr } from "@/lib/i18n/tr";

// AÇILIŞ SESİ — Pusula sinematik girişinin sabit repliklerini KİŞİNİN KENDİ
// klonlanmış sesiyle (ses ritüelinde üretilen voice_id) seslendirir: "yansıman
// kendi sesinle sana sesleniyor". Klon yoksa AYNA marka sesine düşer; anahtar
// yoksa 503 → istemci sessiz+altyazı moduna geçer.
// Yalnız beyaz listedeki replik kodları kabul edilir (metin enjeksiyonu yok).
// Cache PRIVATE: ses kişiye özel, paylaşımlı CDN'de başkasına servis edilmemeli.
const REPLIK = tr.pusulaAcilis.replik;

export async function GET(req: Request) {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return new Response("oturum", { status: 401 });
  }
  const kod = new URL(req.url).searchParams.get("k") ?? "";
  const metin = REPLIK[kod];
  if (!metin) return new Response("bilinmeyen replik", { status: 404 });
  if (!sesYapilandirildiMi()) return new Response("ses kapalı", { status: 503 });

  // Kişinin klonu varsa onu kullan (yansıman = kendi sesin); yoksa AYNA sesi.
  const db = supabaseAdmin();
  const { data: profil } = await db
    .from("voice_profiles")
    .select("voice_id, status")
    .eq("participant_id", session.sub)
    .maybeSingle();
  const voiceId =
    profil?.status === "klonlandi" && profil.voice_id ? profil.voice_id : aynaSesId();

  try {
    const buf = await seslendir(voiceId, metin);
    return new Response(buf, {
      headers: {
        "content-type": "audio/mpeg",
        "cache-control": "private, max-age=3600",
      },
    });
  } catch {
    return new Response("seslendirme hatası", { status: 502 });
  }
}
