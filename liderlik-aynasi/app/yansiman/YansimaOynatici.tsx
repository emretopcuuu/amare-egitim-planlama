"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { tr } from "@/lib/i18n/tr";

// Tam ekran yansıma oynatıcısı: tek iş, tek dev buton (UX ilkesi).
// Mobil tarayıcılar sesi/videoyu dokunuşla başlatır — ▶ tam o dokunuştur.
export default function YansimaOynatici({ url }: { url: string }) {
  const video = useRef<HTMLVideoElement | null>(null);
  const [basladi, setBasladi] = useState(false);

  function oynat() {
    setBasladi(true);
    void video.current?.play().catch(() => setBasladi(false));
  }

  return (
    <main className="fixed inset-0 z-50 bg-black">
      <video
        ref={video}
        src={url}
        playsInline
        onEnded={() => setBasladi(false)}
        className="h-full w-full object-cover"
      />
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
