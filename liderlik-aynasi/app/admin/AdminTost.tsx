"use client";

import { useEffect, useState } from "react";
import type { TostTipi } from "@/lib/tost";

type Tost = { id: number; mesaj: string; tip: TostTipi };
let sayac = 0;

const STIL: Record<TostTipi, string> = {
  basari: "border-emerald-400/50 bg-emerald-500/15 text-emerald-200",
  hata: "border-red-400/50 bg-red-500/15 text-red-200",
  bilgi: "border-royal-light/50 bg-royal/20 text-slate-100",
};

const IKON: Record<TostTipi, string> = {
  basari: "✓",
  hata: "⚠",
  bilgi: "•",
};

// #10 Admin eylem tostu: her eylemden sonra köşede kısa "✓ yapıldı" bildirimi;
// tip'e göre renk kodu (yeşil=başarı, kırmızı=hata, sakin=bilgi). 3.5 sn solar.
export default function AdminTost() {
  const [liste, setListe] = useState<Tost[]>([]);

  useEffect(() => {
    function dinle(e: Event) {
      const d = (e as CustomEvent).detail as { mesaj: string; tip: TostTipi };
      const id = ++sayac;
      setListe((l) => [...l, { id, mesaj: d.mesaj, tip: d.tip }]);
      setTimeout(() => setListe((l) => l.filter((x) => x.id !== id)), 3500);
    }
    window.addEventListener("admin-tost", dinle);
    return () => window.removeEventListener("admin-tost", dinle);
  }, []);

  if (liste.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[60] flex flex-col items-end gap-2 print:hidden">
      {liste.map((t) => (
        <div
          key={t.id}
          role="status"
          aria-live="polite"
          className={`kutlama-serit flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold shadow-xl backdrop-blur ${STIL[t.tip]}`}
        >
          <span aria-hidden>{IKON[t.tip]}</span>
          {t.mesaj}
        </div>
      ))}
    </div>
  );
}
