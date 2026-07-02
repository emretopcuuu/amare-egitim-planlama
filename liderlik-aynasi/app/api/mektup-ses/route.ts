import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";

export const maxDuration = 30;

// [E1-c] Katılımcının KENDİ Ayna Mektubu sesini SABİT yoldan sunar (imzalı URL
// değişkendir; service worker'ın önbelleğe alabilmesi için stabil yol gerek).
// Baytları storage'dan proxy'ler. Reveal kapısı YOK: kişinin kendi verisi + amaç
// reveal anında yükü sıfırlamak (SW önden çeker, reveal'de anında çalar). Ses
// opaktır; içerik reveal'de metin olarak zaten açılır.
export async function GET() {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return new Response("Yetkisiz", { status: 401 });
  }
  const db = supabaseAdmin();
  const { data: mektup } = await db
    .from("mirror_letters")
    .select("voice_path")
    .eq("participant_id", session.sub)
    .maybeSingle();
  if (!mektup?.voice_path) {
    // Ses yok (klon üretilmedi) — istemci marka sesine düşer.
    return new Response("Ses yok", { status: 404 });
  }
  const { data: dosya, error } = await db.storage.from("sesler").download(mektup.voice_path);
  if (error || !dosya) return new Response("Ses bulunamadı", { status: 404 });

  const buf = await dosya.arrayBuffer();
  return new Response(buf, {
    headers: {
      "content-type": "audio/mpeg",
      "cache-control": "private, max-age=86400",
    },
  });
}
