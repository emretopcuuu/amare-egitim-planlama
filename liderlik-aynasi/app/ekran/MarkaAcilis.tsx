"use client";

import { useEffect, useRef, useState } from "react";

// Büyük ekran marka açılışı: sayfa yüklenince ONE TEAM marka VİDEOSU bir kez
// oynar, sonra solup canlı nabzı açar. Sunum ekranı her yüklemede markayı
// taşısın diye gating yok. Otomatik oynatma engellenirse ~11 sn güvenlik ağı.
export default function MarkaAcilis() {
  const [bitti, setBitti] = useState(false);
  const [soluyor, setSoluyor] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    // KRİTİK: bazı tarayıcılar/kiosk (özellikle GİZLİ MOD) `autoPlay` öz-
    // niteliğini yok sayıp poster'da donuyordu → video "statik görsele" dönüyor
    // gibi görünüyordu. .play()'i AÇIKÇA çağırmak videoyu güvenle başlatır.
    videoRef.current?.play().catch(() => {});
    const z = setTimeout(kapat, 11000);
    return () => clearTimeout(z);
  }, []);

  function kapat() {
    setSoluyor(true);
    setTimeout(() => setBitti(true), 500);
  }

  if (bitti) return null;

  return (
    <div
      className={`fixed inset-0 z-[80] bg-black transition-opacity duration-500 ${
        soluyor ? "opacity-0" : "opacity-100"
      }`}
    >
      <video
        ref={videoRef}
        src="/marka.mp4"
        autoPlay
        muted
        playsInline
        preload="auto"
        onEnded={kapat}
        onError={kapat}
        poster="/marka-poster.jpg"
        className="h-full w-full object-contain"
      />
    </div>
  );
}
