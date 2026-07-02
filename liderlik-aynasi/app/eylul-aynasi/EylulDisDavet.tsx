"use client";

import { useState } from "react";

// [E11] Katılımcı, ekibinden 3 kişiye dış değerlendirme linki yollar. Tokenlar
// tek kullanımlık + 14 gün. Sistem mesaj GÖNDERMEZ; kişi kendi WhatsApp'ından atar.
export default function EylulDisDavet({ ilk }: { ilk: string[] }) {
  const [tokenlar, setTokenlar] = useState<string[]>(ilk);
  const [yukleniyor, setYukleniyor] = useState(false);

  async function uret() {
    if (yukleniyor) return;
    setYukleniyor(true);
    try {
      const r = await fetch("/api/eylul-dis", { method: "POST" });
      const v = await r.json().catch(() => null);
      if (r.ok && Array.isArray(v?.tokenlar)) setTokenlar(v.tokenlar);
    } catch {
      /* sessiz */
    } finally {
      setYukleniyor(false);
    }
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const link = (t: string) => `${origin}/dis/${t}`;
  const waMetin = (t: string) =>
    `Selam! Gelişim yolculuğumda senin dürüst gözünü istiyorum — 2 dk sürer, isim istemez: ${link(t)}`;

  return (
    <div className="rounded-2xl border border-white/10 bg-midnight-card/50 p-4">
      <p className="text-sm font-semibold text-slate-200">👁 Dış göz: 3 kişiye sor</p>
      <p className="mt-1 text-xs text-slate-400">
        Ekibinden/çevrenden 3 kişiye tek kullanımlık link yolla. Onlar oturumsuz, anonim doldurur. Sen adını görürsün,
        onlar isim vermez.
      </p>

      {tokenlar.length === 0 ? (
        <button
          onClick={() => void uret()}
          disabled={yukleniyor}
          className="btn-kor mt-3 flex h-11 w-full items-center justify-center rounded-2xl text-sm font-bold disabled:opacity-50"
        >
          {yukleniyor ? "Hazırlanıyor…" : "3 link oluştur"}
        </button>
      ) : (
        <ul className="mt-3 space-y-2">
          {tokenlar.map((t, i) => (
            <li key={t} className="flex items-center gap-2">
              <span className="text-xs text-slate-500">{i + 1}.</span>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(waMetin(t))}`}
                target="_blank"
                rel="noreferrer"
                className="flex h-10 flex-1 items-center justify-center rounded-xl bg-emerald-500/20 text-sm font-semibold text-emerald-300"
              >
                📲 WhatsApp&apos;tan yolla
              </a>
              <button
                onClick={() => void navigator.clipboard?.writeText(link(t)).catch(() => {})}
                className="h-10 rounded-xl border border-white/15 px-3 text-xs text-slate-300"
              >
                Kopyala
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
