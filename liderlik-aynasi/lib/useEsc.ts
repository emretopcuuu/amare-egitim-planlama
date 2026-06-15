"use client";

import { useEffect } from "react";

// #10 Erişilebilirlik: açık modal'da Esc ile kapatma. Tam-ekran portal
// katmanlarında (kamera, story, avatar, foto detay…) klavye kullanıcısı kapana
// kısılmasın.
export function useEsc(aktif: boolean, kapat: () => void) {
  useEffect(() => {
    if (!aktif) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") kapat();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [aktif, kapat]);
}
