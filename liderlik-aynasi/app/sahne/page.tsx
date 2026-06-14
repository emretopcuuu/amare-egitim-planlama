"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { tr } from "@/lib/i18n/tr";

// PROJEKTÖR SAYFASI — salon perdesi için.
// Açılışta sessiz göl döngüsü oynar; sunucu tıklayınca (ya da boşluk tuşuyla)
// Ayna Anı açılış filmi sesli oynar ve bitince canlı büyük ekrana geçilir.
// Oturum gerektirmez: /ekran gibi herkese açıktır, kişisel veri içermez.
export default function SahnePage() {
  const router = useRouter();
  const [film, setFilm] = useState(false);
  // Açılışta ONE TEAM marka videosu bir kez oynar; bitince göl döngüsüne geçer.
  // Sunucu tıklarsa/space'e basarsa doğruca Ayna Anı filmine atlar (akış korunur).
  const [marka, setMarka] = useState(true);

  function filmiBaslat() {
    setFilm(true);
  }

  // klavye, sayfa odağı olmadan da çalışsın (sunum kumandaları boşluk yollar)
  useEffect(() => {
    function tusla(e: KeyboardEvent) {
      if (e.key === " " || e.key === "Enter") setFilm(true);
    }
    window.addEventListener("keydown", tusla);
    return () => window.removeEventListener("keydown", tusla);
  }, []);

  return (
    <main
      className="fixed inset-0 cursor-pointer bg-black"
      onClick={filmiBaslat}
    >
      {marka && !film ? (
        <video
          src="/marka.mp4"
          autoPlay
          muted
          playsInline
          onEnded={() => setMarka(false)}
          poster="/marka-poster.jpg"
          className="h-full w-full object-contain"
        />
      ) : !film ? (
        <>
          <video
            src="/sahne-loop.mp4"
            autoPlay
            muted
            loop
            playsInline
            className="h-full w-full object-cover"
          />
          <p className="absolute bottom-6 left-1/2 -translate-x-1/2 text-xs tracking-[0.3em] text-white/25 uppercase">
            {tr.sahne.ipucu}
          </p>
        </>
      ) : (
        <video
          src="/ayna-acilis.mp4"
          autoPlay
          playsInline
          onEnded={() => router.push("/ekran")}
          className="h-full w-full object-cover"
        />
      )}
    </main>
  );
}
