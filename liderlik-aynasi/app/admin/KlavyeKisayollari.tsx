"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";

// UX #1 — Klavye kısayolları katmanı. ⌘K (Komut Paleti) zaten var; bu katman
// tek-tuş hızlı gezinme ekler: 1–5 aşama menüleri, P → Panel, ? → kısayol kartı.
// Yazı alanındayken veya bir modifiye tuşu basılıyken devreye girmez.
const ROTALAR: Record<string, string> = {
  "1": "/admin/kontrol/hazirlik",
  "2": "/admin/farkindalik",
  "3": "/admin/kontrol/canli",
  "4": "/admin/kontrol/final",
  "5": "/admin/sistem",
  p: "/admin",
};

const KARTLAR: { tus: string; ad: string }[] = [
  { tus: "1", ad: "1 · Hazırlık kontrolleri" },
  { tus: "2", ad: "2 · Katılım (Farkındalık)" },
  { tus: "3", ad: "3 · Kamp Canlı kontrolleri" },
  { tus: "4", ad: "4 · Final kontrolleri" },
  { tus: "5", ad: "5 · Sistem & Bakım" },
  { tus: "P", ad: "Panel (ana ekran)" },
  { tus: "⌘K", ad: "Hızlı eylem / arama" },
  { tus: "?", ad: "Bu kısayol kartı" },
];

function yaziAlanindaMi(el: EventTarget | null): boolean {
  const h = el as HTMLElement | null;
  if (!h) return false;
  const etiket = h.tagName;
  return (
    etiket === "INPUT" ||
    etiket === "TEXTAREA" ||
    etiket === "SELECT" ||
    h.isContentEditable === true
  );
}

export default function KlavyeKisayollari() {
  const router = useRouter();
  const [kart, setKart] = useState(false);

  useEffect(() => {
    function bas(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return; // ⌘K vb. çakışmasın
      if (yaziAlanindaMi(e.target)) return;
      if (e.key === "Escape") {
        setKart(false);
        return;
      }
      if (e.key === "?") {
        e.preventDefault();
        setKart((k) => !k);
        return;
      }
      const tus = e.key.toLowerCase();
      const rota = ROTALAR[tus];
      if (rota) {
        e.preventDefault();
        setKart(false);
        router.push(rota);
      }
    }
    window.addEventListener("keydown", bas);
    return () => window.removeEventListener("keydown", bas);
  }, [router]);

  if (!kart) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4"
      onClick={() => setKart(false)}
    >
      <div
        role="dialog"
        aria-label="Klavye kısayolları"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl border border-royal/40 bg-midnight-card p-5 shadow-2xl"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-gold-light">⌨️ Klavye Kısayolları</h2>
          <button
            onClick={() => setKart(false)}
            aria-label="Kapat"
            className="rounded-lg px-2 py-1 text-slate-400 hover:bg-white/10 hover:text-gold-light"
          >
            ✕
          </button>
        </div>
        <ul className="space-y-1.5">
          {KARTLAR.map((k) => (
            <li key={k.tus} className="flex items-center justify-between gap-3 text-sm">
              <span className="text-slate-200">{k.ad}</span>
              <kbd className="shrink-0 rounded-md border border-white/20 bg-white/5 px-2 py-0.5 font-mono text-xs text-gold-light">
                {k.tus}
              </kbd>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-slate-500">
          İpucu: Yazı yazarken kısayollar devre dışıdır. Kapatmak için Esc.
        </p>
      </div>
    </div>,
    document.body
  );
}
