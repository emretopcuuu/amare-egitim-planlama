"use client";

import { useEffect, useState } from "react";
import PusulaAcilis from "@/components/PusulaAcilis";

// Pusula sinematik açılışını egzersizden ÖNCE bir kez gösterir. "goster" yalnız
// yeni başlayanlar için açıktır (sunucu kapısı); cihaz başına localStorage ile
// tekrar oynatılmaz. Bitince/geçilince PusulaSohbet ortaya çıkar (zaten arkada).
const ANAHTAR = "la_pusula_acilis_v2";

export default function PusulaGiris({
  ad,
  goster,
  children,
}: {
  ad: string;
  goster: boolean;
  children: React.ReactNode;
}) {
  const [acilis, setAcilis] = useState(false);

  useEffect(() => {
    if (!goster) return;
    let gorulmus = false;
    try {
      gorulmus = localStorage.getItem(ANAHTAR) === "1";
    } catch {}
    if (!gorulmus) setAcilis(true);
  }, [goster]);

  function bitir() {
    try {
      localStorage.setItem(ANAHTAR, "1");
    } catch {}
    setAcilis(false);
  }

  return (
    <>
      {children}
      {acilis && <PusulaAcilis ad={ad} onBitti={bitir} />}
    </>
  );
}
