"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

// Mobil tarayıcılar sesli otomatik oynatmayı engeller — bu yüzden "dokun ve
// izle" deseni: kullanıcı jesti olmadan video başlamaz. Video bozuksa/yüklenemezse
// (onError) devam butonu HEMEN açılır — kapı önündeki sıra asla tıkanmasın.
//
// DAYANIKLILIK (kamp açılışında en olası arıza modu buffering): zayıf ağda video
// donarsa onEnded/onError'ın HİÇBİRİ tetiklenmez. Bu yüzden oynat'a dokununca
// 8 sn sonra HER KOŞULDA görünen bir "Geç ve devam et" çıkışı belirir; ayrıca
// stall/waiting anında hemen görünür. Kimse siyah ekranda kilitli kalmaz.
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
  // Video bitmese bile çıkışın görünür olduğu durum (stall / 8 sn güvenlik ağı).
  const [gecGoster, setGecGoster] = useState(false);
  const zamanlayiciRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (zamanlayiciRef.current) clearTimeout(zamanlayiciRef.current);
    };
  }, []);

  function oynat() {
    setOynatildi(true);
    // 8 sn sonra geç butonu her koşulda belirsin (buffering ended/error atmaz).
    if (zamanlayiciRef.current) clearTimeout(zamanlayiciRef.current);
    zamanlayiciRef.current = setTimeout(() => setGecGoster(true), 8000);
    videoRef.current?.play().catch(() => setBitti(true));
  }

  return (
    <div className="w-full max-w-md">
      <div className="relative aspect-[9/16] w-full overflow-hidden rounded-3xl bg-white/5">
        <video
          ref={videoRef}
          src={src}
          playsInline
          preload="none"
          controls={oynatildi}
          onEnded={() => setBitti(true)}
          onError={() => setBitti(true)}
          onStalled={() => setGecGoster(true)}
          onWaiting={() => setGecGoster(true)}
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

      {bitti ? (
        <Link
          href="/"
          className="btn-kor parilti mt-6 flex h-14 w-full items-center justify-center rounded-2xl text-lg font-semibold"
        >
          {devamDugme}
        </Link>
      ) : (
        // Video sürerken küçük, ikincil çıkış — yalnız oynatma başladıysa ve
        // (8 sn geçti / video takıldı) görünür. Kimse kapıda kilitli kalmasın.
        oynatildi &&
        gecGoster && (
          <Link
            href="/"
            className="mt-4 flex h-11 w-full items-center justify-center rounded-xl border border-white/20 text-sm font-medium text-slate-300 hover:bg-white/5"
          >
            Geç ve devam et →
          </Link>
        )
      )}
    </div>
  );
}
