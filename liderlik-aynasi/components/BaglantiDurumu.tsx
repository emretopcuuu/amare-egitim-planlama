"use client";

import { useEffect, useState } from "react";
import { tr } from "@/lib/i18n/tr";

const t = tr.baglanti;

// Görünür internet kalkanı (#5): kamp alanında çekim zayıf olabilir. Aday
// "verim kayboldu mu?" diye korkmasın — bağlantı kesilince sakin bir şerit
// "cihazında güvende, bağlanınca gönderilir" der; geri gelince kısa bir ✓.
// Alt navigasyonun hemen üstünde, başparmak hizasında. Çevrimiçi ve hiç
// kopmadıysa hiçbir şey göstermez (gürültüsüz).
export default function BaglantiDurumu() {
  // "yok" = şu an çevrimdışı, "geldi" = az önce geri geldi (kısa süre), null = sessiz
  const [durum, setDurum] = useState<"yok" | "geldi" | null>(null);

  useEffect(() => {
    let zaman: ReturnType<typeof setTimeout> | null = null;

    function cevrimdisi() {
      if (zaman) clearTimeout(zaman);
      setDurum("yok");
    }
    function cevrimici() {
      // Yalnızca kopmuştan sonra "geri geldi" göster; ilk yüklemede gösterme.
      setDurum((eski) => (eski === "yok" ? "geldi" : eski));
      if (zaman) clearTimeout(zaman);
      zaman = setTimeout(() => setDurum(null), 3500);
    }

    // İlk durumu ölç: zaten çevrimdışı açıldıysa hemen uyar.
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDurum("yok");
    }
    window.addEventListener("offline", cevrimdisi);
    window.addEventListener("online", cevrimici);
    return () => {
      if (zaman) clearTimeout(zaman);
      window.removeEventListener("offline", cevrimdisi);
      window.removeEventListener("online", cevrimici);
    };
  }, []);

  if (!durum) return null;

  const yok = durum === "yok";
  return (
    <div
      role="status"
      aria-live="polite"
      className={`baglanti-serit fixed inset-x-0 bottom-0 z-50 px-4 py-3 text-center text-sm font-semibold ${
        yok
          ? "bg-amber-500/95 text-amber-950"
          : "bg-emerald-500/95 text-emerald-950"
      }`}
    >
      {yok ? t.cevrimdisi : t.geriGeldi}
    </div>
  );
}
