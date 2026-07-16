"use client";

import { useState } from "react";
import { tr } from "@/lib/i18n/tr";

// Onlarca-yüzlerce kartın hepsinde aynı logo görseli var — window.print()
// resimler daha yüklenmeden tetiklenirse bazı tarayıcılar/PDF sürücüleri o
// kartlarda kırık/boş görsel basar ("PDF bozuk"). Yazdırmadan önce sayfadaki
// tüm <img>'lerin yüklenmesini (ya da hatasını) bekleyip öyle print açıyoruz.
export default function YazdirButonu() {
  const [hazirlaniyor, setHazirlaniyor] = useState(false);

  async function yazdir() {
    if (hazirlaniyor) return;
    setHazirlaniyor(true);
    try {
      const resimler = Array.from(document.querySelectorAll("img"));
      await Promise.all(
        resimler.map(
          (img) =>
            img.complete
              ? Promise.resolve()
              : new Promise<void>((resolve) => {
                  img.addEventListener("load", () => resolve(), { once: true });
                  img.addEventListener("error", () => resolve(), { once: true });
                })
        )
      );
      window.print();
    } finally {
      setHazirlaniyor(false);
    }
  }

  return (
    <button
      onClick={yazdir}
      disabled={hazirlaniyor}
      className="shrink-0 rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-[#1a1206] transition-colors hover:bg-gold-light disabled:opacity-60"
    >
      {hazirlaniyor ? "Hazırlanıyor…" : `🖨 ${tr.admin.qr.yazdir}`}
    </button>
  );
}
