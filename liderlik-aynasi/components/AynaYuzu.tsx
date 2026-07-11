"use client";

/* AYNA'nın yüzü (Faz 1) — Higgsfield'da üretilmiş, uygulamaya STATİK gömülü
   maskot poz seti. Kampta hiçbir şey canlı üretilmez: bu bileşen yalnız doğru
   pozu gösterir (sıfır gecikme, sıfır üretim riski). Kaynak: public/ayna/.

   Görsel paket #6 — CROSS-FADE: durum değişince eski poz ~320ms solarak
   kaybolur, yenisi belirir (ışınlanma yerine "ifade değiştirme" hissi).
   Kullanım: <AynaYuzu durum="kus" boyut={96} />
   Proje konvansiyonu gereği düz <img> (next/image pipeline'ı kullanılmıyor). */

import { useEffect, useState } from "react";

export type AynaDurum =
  | "notr" // sakin, bilmiş gülümseme — varsayılan
  | "konusuyor" // anons/radyo/sohbet anları
  | "etkilenmis" // yüksek puan, fiero, barışma
  | "kus" // küslük modu (Faz 2)
  | "korkmus" // bowling running gag'i
  | "gururlu" // iddia kazanma, kendini beğenme
  | "saskin" // tahmin yanılması, rekor
  | "kutlama" // görev tamamlama, zafer
  | "heyecanli" // görsel paket #1 — mühür ekranında kampı bekleyen AYNA
  | "uykuda"; // görsel paket #5 — sessiz saatlerde uyuyan AYNA

const DOSYA: Record<AynaDurum, string> = {
  notr: "/ayna/notr.webp",
  konusuyor: "/ayna/konusuyor.webp",
  etkilenmis: "/ayna/etkilenmis.webp",
  kus: "/ayna/kus.webp",
  korkmus: "/ayna/korkmus.webp",
  gururlu: "/ayna/gururlu.webp",
  saskin: "/ayna/saskin.webp",
  kutlama: "/ayna/kutlama.webp",
  heyecanli: "/ayna/heyecanli.webp",
  uykuda: "/ayna/uykuda.webp",
};

// Ekran okuyucular için pozun tek satırlık tarifi (karakter de erişilebilir).
const TARIF: Record<AynaDurum, string> = {
  notr: "AYNA sakin gülümsüyor",
  konusuyor: "AYNA konuşuyor",
  etkilenmis: "AYNA etkilenmiş görünüyor",
  kus: "AYNA küsmüş, kollarını bağlamış",
  korkmus: "AYNA korkmuş görünüyor",
  gururlu: "AYNA gururla bakıyor",
  saskin: "AYNA şaşkın",
  kutlama: "AYNA kutlama yapıyor",
  heyecanli: "AYNA heyecanla bekliyor",
  uykuda: "AYNA uyuyor",
};

export default function AynaYuzu({
  durum = "notr",
  boyut = 80,
  sinif = "",
  hareketli = true,
}: {
  durum?: AynaDurum;
  /** Piksel cinsinden kare kenar uzunluğu */
  boyut?: number;
  sinif?: string;
  /** Faz 1.5 — poz bazlı mikro-animasyon (globals.css; reduced-motion'da kapalı) */
  hareketli?: boolean;
}) {
  // #6 cross-fade: görünen poz + solmakta olan eski poz.
  const [gorunen, setGorunen] = useState<AynaDurum>(durum);
  const [eski, setEski] = useState<AynaDurum | null>(null);
  useEffect(() => {
    if (durum === gorunen) return;
    setEski(gorunen);
    setGorunen(durum);
    const id = setTimeout(() => setEski(null), 340);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [durum]);

  return (
    <span
      className={`relative inline-block select-none ${sinif}`}
      style={{ width: boyut, height: boyut }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={DOSYA[gorunen]}
        alt={TARIF[gorunen]}
        width={boyut}
        height={boyut}
        loading="lazy"
        decoding="async"
        className={`${eski ? "ayna-poz-belir" : ""} ${hareketli ? `ayna-anim-${gorunen}` : ""}`}
        draggable={false}
      />
      {eski && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={DOSYA[eski]}
          alt=""
          aria-hidden
          width={boyut}
          height={boyut}
          className="ayna-poz-sol pointer-events-none absolute inset-0"
          draggable={false}
        />
      )}
    </span>
  );
}
