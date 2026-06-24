"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { tr } from "@/lib/i18n/tr";

// Tam ekran yansıma oynatıcısı.
// Video (Wan 2.7 seamless loop) + ses (ElevenLabs klon) ayrı dosyalar;
// browser senkron başlatır — video sessiz döner, ses bir kez çalar.
// Ses yoksa yalnızca video oynar (backward compat).
export default function YansimaOynatici({
  videoUrl,
  audioUrl,
}: {
  videoUrl: string;
  audioUrl?: string;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [basladi, setBasladi] = useState(false);

  function oynat() {
    setBasladi(true);
    void videoRef.current?.play().catch(() => {});
    void audioRef.current?.play().catch(() => {});
  }

  // Ses bitince video döngüsünü durdur ve başlangıç ekranına dön
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const bitti = () => {
      setBasladi(false);
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }
    };
    a.addEventListener("ended", bitti);
    return () => a.removeEventListener("ended", bitti);
  }, []);

  return (
    <main className="fixed inset-0 z-50 bg-black">
      <video
        ref={videoRef}
        src={videoUrl}
        playsInline
        // Ayrı ses varsa video sessiz döngüde döner; sesi gömülü tek dosyada
        // (önden üretim) bir kez oynar — anlatım tekrar etmesin.
        loop={!!audioUrl}
        muted={!!audioUrl}
        onEnded={audioUrl ? undefined : () => setBasladi(false)}
        className="h-full w-full object-contain"
      />
      {audioUrl && (
        <audio ref={audioRef} src={audioUrl} preload="auto" />
      )}
      {!basladi && (
        <button
          onClick={oynat}
          className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 p-6 text-center"
        >
          <span className="prizma-serif ay-metin text-4xl font-semibold leading-tight">
            👁 {tr.yansiman.baslik}
          </span>
          <span className="btn-kor parilti mt-10 flex h-16 w-64 items-center justify-center rounded-2xl text-xl font-bold">
            {tr.yansiman.izle}
          </span>
        </button>
      )}
      <Link
        href="/"
        className="absolute bottom-6 left-1/2 -translate-x-1/2 text-base text-white/60 underline-offset-4 hover:underline"
      >
        ← {tr.degerlendir.anaSayfayaDon}
      </Link>
    </main>
  );
}
