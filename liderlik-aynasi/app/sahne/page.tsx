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
      {!film ? (
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
