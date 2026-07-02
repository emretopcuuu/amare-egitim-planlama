import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { tr } from "@/lib/i18n/tr";
import YansimaOynatici from "./YansimaOynatici";

export const metadata = { title: "Yansıman — Liderlik Aynası" };

// "Aynan seni gördü": ritüel fotoğrafından üretilen kişisel yansıma videosu.
// [M10] Video hazır değilse SESSİZCE ana sayfaya atmak yerine (push linkine geç
// tıklayan → "hiçbir şey olmadı" hissi) durumuna göre nazik bir bekleme ekranı.
const HAZIRLANIYOR = new Set(["bekliyor", "uretiliyor", "ses_uretiliyor"]);

function DurumEkrani({
  ikon,
  baslik,
  metin,
}: {
  ikon: string;
  baslik: string;
  metin: string;
}) {
  return (
    <main className="koyu-alan fixed inset-0 z-50 flex flex-col items-center justify-center bg-black p-8 text-center">
      <span className="text-6xl" aria-hidden>{ikon}</span>
      <h1 className="prizma-serif ay-metin mt-6 text-3xl font-semibold leading-tight">{baslik}</h1>
      <p className="mt-4 max-w-sm text-base leading-relaxed text-slate-300">{metin}</p>
      <Link
        href="/"
        className="mt-10 text-base text-white/60 underline-offset-4 hover:underline"
      >
        {tr.yansiman.geriDon}
      </Link>
    </main>
  );
}

export default async function YansimanPage() {
  const session = await getSession();
  if (!session) redirect("/giris");
  if (session.rol !== "participant") redirect("/admin");

  const db = supabaseAdmin();
  const { data: profil } = await db
    .from("voice_profiles")
    .select("video_path, audio_path, video_status")
    .eq("participant_id", session.sub)
    .maybeSingle();

  // Video üretim aşamasındaysa: "hazırlanıyor" ekranı.
  if (HAZIRLANIYOR.has(profil?.video_status ?? "")) {
    return (
      <DurumEkrani
        ikon="🌊"
        baslik={tr.yansiman.hazirlaniyorBaslik}
        metin={tr.yansiman.hazirlaniyorMetin}
      />
    );
  }

  // Hazır değil / yok / hata / imza üretilemedi: "henüz hazır değil" ekranı.
  const hazir = profil?.video_status === "hazir" && !!profil.video_path;
  const [videoImza, audioImza] = hazir
    ? await Promise.all([
        db.storage.from("sesler").createSignedUrl(profil.video_path as string, 3600),
        profil.audio_path
          ? db.storage.from("sesler").createSignedUrl(profil.audio_path, 3600)
          : Promise.resolve({ data: null }),
      ])
    : [{ data: null }, { data: null }];

  if (!hazir || !videoImza.data) {
    return (
      <DurumEkrani
        ikon="👁"
        baslik={tr.yansiman.yokBaslik}
        metin={tr.yansiman.yokMetin}
      />
    );
  }

  return (
    <YansimaOynatici
      videoUrl={videoImza.data.signedUrl}
      audioUrl={audioImza.data?.signedUrl}
    />
  );
}
