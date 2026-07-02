import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { aynaSesId, seslendir, sesYapilandirildiMi } from "@/lib/eleven";

export const maxDuration = 30;

// GÖREV SESİ — "AYNA'dan dinle": görev metnini kişinin seçtiği AYNA sesiyle
// (erkek/kadın, ElevenLabs) seslendirir. Metin İSTEMCİDEN gelmez — sunucuda
// missions tablosundan (kişinin KENDİ görevi) okunur; enjeksiyon riski yok.
// Klon fısıltısı olan görevler (gizli/cesaret) zaten voice_path ile SesCal'de
// çalar; bu uç, klonu OLMAYAN görevlerde tarayıcının robot sesi (speechSynthesis)
// yerine gerçek AYNA sesini getirir. Üretilen mp3 depoya önbelleklenir → tekrar
// dinlemede yeni üretim yok (maliyet: görev+cinsiyet başına bir kez).
export async function GET(req: Request) {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ hata: "oturum" }, { status: 401 });
  }
  if (!sesYapilandirildiMi()) {
    // ElevenLabs kapalı → istemci tarayıcı TTS'ine (robot) düşer.
    return Response.json({ hata: "ses-kapali" }, { status: 503 });
  }

  const gorevId = new URL(req.url).searchParams.get("id") ?? "";
  if (!gorevId) return Response.json({ hata: "eksik" }, { status: 400 });

  const db = supabaseAdmin();
  const [{ data: gorev }, { data: kisi }] = await Promise.all([
    db
      .from("missions")
      .select("id, title, body, voice_path")
      .eq("id", gorevId)
      .eq("participant_id", session.sub)
      .maybeSingle(),
    db.from("participants").select("ayna_ses").eq("id", session.sub).maybeSingle(),
  ]);
  if (!gorev) return Response.json({ hata: "yok" }, { status: 404 });

  // Zaten klon fısıltısı üretilmişse onu döndür (kişinin kendi sesi > marka sesi).
  if (gorev.voice_path) {
    const { data: imzali } = await db.storage.from("sesler").createSignedUrl(gorev.voice_path, 3600);
    if (imzali?.signedUrl) return Response.json({ url: imzali.signedUrl });
  }

  const cinsiyet = kisi?.ayna_ses === "kadin" ? "kadin" : "erkek";
  const yol = `gorev-ayna/${session.sub}/${gorevId}-${cinsiyet}.mp3`;

  // Önbellek: bu görev+cinsiyet için daha önce üretildiyse yeni ElevenLabs
  // çağrısı yapma — imzalı URL yeter.
  const mevcut = await db.storage.from("sesler").createSignedUrl(yol, 3600);
  if (mevcut.data?.signedUrl) return Response.json({ url: mevcut.data.signedUrl });

  try {
    const metin = `${gorev.title}. ${gorev.body}`.slice(0, 900);
    const mp3 = await seslendir(aynaSesId(cinsiyet), metin);
    const yukleme = await db.storage
      .from("sesler")
      .upload(yol, Buffer.from(mp3), { contentType: "audio/mpeg", upsert: true });
    if (yukleme.error) return Response.json({ hata: "yuklenemedi" }, { status: 502 });
    const { data: imzali } = await db.storage.from("sesler").createSignedUrl(yol, 3600);
    if (!imzali?.signedUrl) return Response.json({ hata: "imza" }, { status: 502 });
    return Response.json({ url: imzali.signedUrl });
  } catch {
    return Response.json({ hata: "seslendirme" }, { status: 502 });
  }
}
