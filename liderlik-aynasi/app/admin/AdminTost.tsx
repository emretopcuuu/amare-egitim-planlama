"use client";

import { useEffect, useState } from "react";
import { tr } from "@/lib/i18n/tr";
import type { TostTipi } from "@/lib/tost";

type Tost = { id: number; mesaj: string; tip: TostTipi; geriAl?: () => void };
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
      const d = (e as CustomEvent).detail as {
        mesaj: string;
        tip: TostTipi;
        geriAl?: () => void;
      };
      const id = ++sayac;
      setListe((l) => [...l, { id, mesaj: d.mesaj, tip: d.tip, geriAl: d.geriAl }]);
      // Geri-al sunulduğunda biraz daha uzun dursun (kullanıcı yetişsin).
      setTimeout(() => setListe((l) => l.filter((x) => x.id !== id)), d.geriAl ? 6000 : 3500);
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
          className={`kutlama-serit flex items-center gap-3 rounded-xl border px-4 py-2.5 text-sm font-semibold shadow-xl backdrop-blur ${STIL[t.tip]}`}
        >
          <span className="flex items-center gap-2">
            <span aria-hidden>{IKON[t.tip]}</span>
            {t.mesaj}
          </span>
          {t.geriAl && (
            <button
              onClick={() => {
                t.geriAl?.();
                setListe((l) => l.filter((x) => x.id !== t.id));
              }}
              className="shrink-0 rounded-lg bg-white/15 px-3 py-1 text-xs font-bold text-white transition-colors hover:bg-white/25"
            >
              {tr.admin.tost.geriAl}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
