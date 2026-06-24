import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import {
  higgsYapilandirildiMi,
  yansimaVideosuBaslat,
  yansimaDurumu,
} from "@/lib/higgs";
import { sesYapilandirildiMi, seslendir, yansimaMetni } from "@/lib/eleven";

// Kişisel yansıma video pipeline'ı.
// Akış: fotoğraf → Wan 2.7 video (Higgsfield) → ElevenLabs ses →
//        Supabase Storage'a yükle → voice_profiles güncelle.
// Video + ses ayrı dosyalarda saklanır; browser senkron oynatır (ffmpeg yok).

const BUCKET = "sesler";
const POLL_INTERVAL_MS = 8_000;
const POLL_MAX_DENEME = 60; // maks ~8 dk

/** Bir katılımcı için video + ses pipeline'ını çalıştırır.
 *  voice_profiles.photo_path dolu olmalı; voice_id klonlanmış olmalı.
 *  Uzun süren (video generation ~2-5 dk) işlem cron'dan çağrılır. */
export async function yansimaUret(participantId: string): Promise<void> {
  const db = supabaseAdmin();

  // Katılımcı + profil bilgisi
  const { data: katilimci } = await db
    .from("participants")
    .select("full_name")
    .eq("id", participantId)
    .maybeSingle();
  if (!katilimci) return;

  const { data: profil } = await db
    .from("voice_profiles")
    .select("photo_path, voice_id, status, video_status")
    .eq("participant_id", participantId)
    .maybeSingle();

  if (!profil?.photo_path) return; // Fotoğraf yüklenmemiş
  if (profil.video_status === "hazir") return; // Zaten hazır

  // Fotoğrafın imzalı URL'ini al
  const { data: imzali } = await db.storage
    .from(BUCKET)
    .createSignedUrl(profil.photo_path, 300);
  if (!imzali?.signedUrl) return;

  // --- 1. Higgsfield Wan 2.7 video üretimi ---
  if (!higgsYapilandirildiMi()) {
    await db
      .from("voice_profiles")
      .update({ video_status: "hata" })
      .eq("participant_id", participantId);
    return;
  }

  await db
    .from("voice_profiles")
    .update({ video_status: "uretiliyor" })
    .eq("participant_id", participantId);

  const requestId = await yansimaVideosuBaslat(imzali.signedUrl);
  if (!requestId) {
    await db
      .from("voice_profiles")
      .update({ video_status: "hata" })
      .eq("participant_id", participantId);
    return;
  }

  await db
    .from("voice_profiles")
    .update({ video_request_id: requestId })
    .eq("participant_id", participantId);

  // Üretim tamamlanana kadar poll et
  let videoUrl: string | null = null;
  for (let i = 0; i < POLL_MAX_DENEME; i++) {
    await bekle(POLL_INTERVAL_MS);
    const sonuc = await yansimaDurumu(requestId);
    if (sonuc.durum === "hazir") {
      videoUrl = sonuc.videoUrl;
      break;
    }
    if (sonuc.durum === "hata") break;
  }

  if (!videoUrl) {
    await db
      .from("voice_profiles")
      .update({ video_status: "hata" })
      .eq("participant_id", participantId);
    return;
  }

  // Video'yu Supabase Storage'a indir + kaydet
  const videoRes = await fetch(videoUrl);
  if (!videoRes.ok) {
    await db
      .from("voice_profiles")
      .update({ video_status: "hata" })
      .eq("participant_id", participantId);
    return;
  }
  const videoBuf = await videoRes.arrayBuffer();
  const videoPath = `yansima/${participantId}/video.mp4`;
  const { error: videoYukHata } = await db.storage
    .from(BUCKET)
    .upload(videoPath, videoBuf, {
      contentType: "video/mp4",
      upsert: true,
    });
  if (videoYukHata) {
    await db
      .from("voice_profiles")
      .update({ video_status: "hata" })
      .eq("participant_id", participantId);
    return;
  }

  // --- 2. ElevenLabs ses üretimi ---
  await db
    .from("voice_profiles")
    .update({ video_status: "ses_uretiliyor", video_path: videoPath })
    .eq("participant_id", participantId);

  if (!sesYapilandirildiMi()) {
    // Ses anahtarı yoksa sadece video ile devam et
    await db
      .from("voice_profiles")
      .update({ video_status: "hazir" })
      .eq("participant_id", participantId);
    return;
  }

  const adSoyad = katilimci.full_name ?? "Arkadaşım";
  const ad = adSoyad.split(" ")[0];
  const metin = yansimaMetni(ad);

  // Klonlanmış ses varsa onu, yoksa AYNA varsayılan sesini kullan
  const voiceId =
    profil.status === "klonlandi" && profil.voice_id
      ? profil.voice_id
      : (process.env.AYNA_SES_ID ?? "pNInz6obpgDQGcFmaJgB");

  let audioPath: string | null = null;
  try {
    const audioBuf = await seslendir(voiceId, metin);
    audioPath = `yansima/${participantId}/ses.mp3`;
    await db.storage
      .from(BUCKET)
      .upload(audioPath, audioBuf, { contentType: "audio/mpeg", upsert: true });
  } catch {
    // Ses üretim hatası: sadece video ile devam et
  }

  await db
    .from("voice_profiles")
    .update({
      video_status: "hazir",
      audio_path: audioPath,
      video_script: metin,
    })
    .eq("participant_id", participantId);
}

/** voice_status='bekliyor' olan kayıtları toplu işle (cron'dan çağrılır). */
export async function bekleyenleriIsle(): Promise<number> {
  const db = supabaseAdmin();
  const { data: bekleyenler } = await db
    .from("voice_profiles")
    .select("participant_id")
    .eq("video_status", "bekliyor")
    .limit(5); // Paralel işlemi sınırla

  if (!bekleyenler?.length) return 0;

  await Promise.allSettled(
    bekleyenler.map((r) => yansimaUret(r.participant_id as string))
  );
  return bekleyenler.length;
}

function bekle(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
