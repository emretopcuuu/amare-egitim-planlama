"use client";

/* AYNA sahne animasyonu (Faz 1.5 — büyük ekranlar): önceden üretilmiş 5 sn'lik
   MP4 döngüleri. Kampta canlı üretim YOK — dosyalar public/ayna/loop-*.mp4
   (proxy istisnasıyla auth'suz yüklenir; /ekran ve /sahne public).
   mod: bekleme (varsayılan) · konusma (radyo çalarken) · kutlama (zafer anı).
   Video oynatılamazsa (eski cihaz) statik poz görseline zarifçe düşer. */

import { useState } from "react";

const LOOP: Record<"bekleme" | "konusma" | "kutlama", { video: string; poz: string }> = {
  bekleme: { video: "/ayna/loop-bekleme.mp4", poz: "/ayna/notr.webp" },
  konusma: { video: "/ayna/loop-konusma.mp4", poz: "/ayna/konusuyor.webp" },
  kutlama: { video: "/ayna/loop-kutlama.mp4", poz: "/ayna/kutlama.webp" },
};

export default function AynaSahneLoop({
  mod = "bekleme",
  boyut = 220,
  sinif = "",
}: {
  mod?: keyof typeof LOOP;
  boyut?: number;
  sinif?: string;
}) {
  const [dustu, setDustu] = useState(false);
  const l = LOOP[mod];
  if (dustu) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={l.poz} alt="AYNA" width={boyut} height={boyut} className={sinif} />;
  }
  return (
    <video
      key={mod} // mod değişince kaynağı taze yükle
      src={l.video}
      width={boyut}
      height={boyut}
      autoPlay
      loop
      muted
      playsInline
      onError={() => setDustu(true)}
      className={`rounded-2xl object-cover ${sinif}`}
      aria-label="AYNA"
    />
  );
}
