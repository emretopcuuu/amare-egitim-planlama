import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { sesKlonla, seslendir, sesYapilandirildiMi } from "@/lib/eleven";
import { selamUret } from "@/lib/yansima";

// SES RİTÜELİ: katılımcı aynaya kendini tanıtır.
// onay=0 → "sessiz ayna" tercihi kaydedilir, bir daha sorulmaz.
// onay=1 + ses → kayıt saklanır, klon oluşur, YANSIMAN'ın ilk selamlaması
// katılımcının kendi sesiyle üretilir ve anında çalınmak üzere döner.
// ElevenLabs anahtarı yoksa kayıt yine saklanır (status: kayitli) —
// klon kamp başlarken tamamlanır; deneyim kırılmaz.

export const maxDuration = 60;

const AZAMI_BAYT = 12 * 1024 * 1024; // ~60 sn webm/mp4 kaydı rahat sığar

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return NextResponse.json({ hata: "oturum" }, { status: 401 });
  }
  const db = supabaseAdmin();

  const form = await req.formData();
  const onay = form.get("onay") === "1";
  const beklentiHam = form.get("beklenti");
  const beklenti =
    typeof beklentiHam === "string" && beklentiHam.trim()
      ? beklentiHam.trim().slice(0, 300)
      : null;

  // Sessiz ayna tercihi: yalnız tercihi yaz, çık
  if (!onay) {
    await db.from("voice_profiles").upsert({
      participant_id: session.sub,
      consent: false,
      status: "yok",
      updated_at: new Date().toISOString(),
    });
    return NextResponse.json({ durum: "sessiz" });
  }

  const ses = form.get("ses");
  if (!(ses instanceof File) || ses.size === 0) {
    return NextResponse.json({ hata: "ses-yok" }, { status: 400 });
  }
  if (ses.size > AZAMI_BAYT) {
    return NextResponse.json({ hata: "ses-buyuk" }, { status: 413 });
  }

  // 1) Ham kaydı sakla (uzantı gerçek formata göre)
  const uzanti = ses.type.includes("mp4") ? "mp4" : "webm";
  const ornekYolu = `${session.sub}/ornek.${uzanti}`;
  const yukleme = await db.storage
    .from("sesler")
    .upload(ornekYolu, ses, { contentType: ses.type || "audio/webm", upsert: true });
  if (yukleme.error) {
    return NextResponse.json({ hata: "depolama" }, { status: 500 });
  }

  // 1b) Fotoğraf (isteğe bağlı): orijinal saklanır (yansıma videosu hammaddesi)
  // ve hayalet silüete çevrilir (sudaki yansıma)
  let facePath: string | null = null;
  let fotoPath: string | null = null;
  const foto = form.get("foto");
  if (foto instanceof File && foto.size > 0 && foto.size <= AZAMI_BAYT) {
    const fotoUzanti = foto.type.includes("png") ? "png" : "jpg";
    const orijinalYol = `${session.sub}/foto.${fotoUzanti}`;
    const fotoYukleme = await db.storage
      .from("sesler")
      .upload(orijinalYol, foto, {
        contentType: foto.type || "image/jpeg",
        upsert: true,
      });
    if (!fotoYukleme.error) fotoPath = orijinalYol;
    try {
      const { hayaletSiluet } = await import("@/lib/siluet");
      const png = await hayaletSiluet(Buffer.from(await foto.arrayBuffer()));
      const siluetYolu = `${session.sub}/siluet.png`;
      const siluetYukleme = await db.storage
        .from("sesler")
        .upload(siluetYolu, png, { contentType: "image/png", upsert: true });
      if (!siluetYukleme.error) facePath = siluetYolu;
    } catch {
      // silüet süstür: fotoğraf işlenemezse prosedürel silüet kalır
    }
  }

  // Anahtar yoksa: kayıt + onay durdu, klon sonraya
  if (!sesYapilandirildiMi()) {
    await db.from("voice_profiles").upsert({
      participant_id: session.sub,
      consent: true,
      status: "kayitli",
      sample_path: ornekYolu,
      beklenti,
      face_path: facePath,
      photo_path: fotoPath,
      video_status: fotoPath ? "bekliyor" : "yok",
      updated_at: new Date().toISOString(),
    });
    return NextResponse.json({ durum: "sonra" });
  }

  // 2) Klonla + ilk selamlamayı üret ve seslendir
  try {
    const voiceId = await sesKlonla(
      `ayna-${session.sub.slice(0, 8)}`,
      ses,
      `ornek.${uzanti}`
    );
    const metin = await selamUret(session.ad, beklenti);
    const mp3 = await seslendir(voiceId, metin);

    const selamYolu = `${session.sub}/selam.mp3`;
    const selamYukleme = await db.storage
      .from("sesler")
      .upload(selamYolu, Buffer.from(mp3), {
        contentType: "audio/mpeg",
        upsert: true,
      });
    if (selamYukleme.error) throw new Error("selam depolama");

    await db.from("voice_profiles").upsert({
      participant_id: session.sub,
      consent: true,
      status: "klonlandi",
      voice_id: voiceId,
      sample_path: ornekYolu,
      beklenti,
      greeting_path: selamYolu,
      face_path: facePath,
      photo_path: fotoPath,
      video_status: fotoPath ? "bekliyor" : "yok",
      updated_at: new Date().toISOString(),
    });

    const { data: imzali } = await db.storage
      .from("sesler")
      .createSignedUrl(selamYolu, 3600);
    return NextResponse.json({ durum: "hazir", url: imzali?.signedUrl ?? null });
  } catch {
    // Klon/seslendirme düştü: kayıt elde, sonra tekrar denenir
    await db.from("voice_profiles").upsert({
      participant_id: session.sub,
      consent: true,
      status: "kayitli",
      sample_path: ornekYolu,
      beklenti,
      face_path: facePath,
      photo_path: fotoPath,
      video_status: fotoPath ? "bekliyor" : "yok",
      updated_at: new Date().toISOString(),
    });
    return NextResponse.json({ durum: "sonra" });
  }
}
