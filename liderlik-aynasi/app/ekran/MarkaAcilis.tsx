"use client";

import { useEffect, useState } from "react";

// Büyük ekran marka açılışı: sayfa yüklenince ONE TEAM reveal'i bir kez oynar,
// sonra solup canlı nabzı açar. Sunum ekranı her yüklemede markayı taşısın
// diye gating yok. Otomatik oynatma engellenirse ~11 sn güvenlik ağı kapatır.
export default function MarkaAcilis() {
  const [bitti, setBitti] = useState(false);
  const [soluyor, setSoluyor] = useState(false);

  useEffect(() => {
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
        src="/marka.mp4"
        autoPlay
        muted
        playsInline
        onEnded={kapat}
        poster="/marka-poster.jpg"
        className="h-full w-full object-contain"
      />
    </div>
  );
}
