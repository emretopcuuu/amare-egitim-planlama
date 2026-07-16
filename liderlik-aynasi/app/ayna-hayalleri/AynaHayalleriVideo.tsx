"use client";

import { useRef, useState } from "react";
import Link from "next/link";

// Mobil tarayıcılar sesli otomatik oynatmayı engeller — bu yüzden "dokun ve
// izle" deseni: kullanıcı jesti olmadan video başlamaz. Video bozuksa/yüklenemezse
// (onError) devam butonu HEMEN açılır — kapı önündeki sıra asla tıkanmasın.
export default function AynaHayalleriVideo({
  src,
  oynatBaslik,
  metin,
  devamDugme,
}: {
  src: string;
  oynatBaslik: string;
  metin: string;
  devamDugme: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [oynatildi, setOynatildi] = useState(false);
  const [bitti, setBitti] = useState(false);

  function oynat() {
    setOynatildi(true);
    videoRef.current?.play().catch(() => setBitti(true));
  }

  return (
    <div className="w-full max-w-md">
      <div className="relative aspect-[9/16] w-full overflow-hidden rounded-3xl bg-white/5">
        <video
          ref={videoRef}
          src={src}
          playsInline
          controls={oynatildi}
          onEnded={() => setBitti(true)}
          onError={() => setBitti(true)}
          className="h-full w-full object-cover"
        />
        {!oynatildi && (
          <button
            type="button"
            onClick={oynat}
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/50"
          >
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 text-2xl">
              ▶
            </span>
            <span className="prizma-serif ay-metin text-lg font-semibold">{oynatBaslik}</span>
            <span className="max-w-[80%] text-sm text-slate-200">{metin}</span>
          </button>
        )}
      </div>

      {bitti && (
        <Link
          href="/"
          className="btn-kor parilti mt-6 flex h-14 w-full items-center justify-center rounded-2xl text-lg font-semibold"
        >
          {devamDugme}
        </Link>
      )}
    </div>
  );
}
