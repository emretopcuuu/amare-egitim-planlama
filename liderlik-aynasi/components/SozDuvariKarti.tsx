"use client";

import { useState } from "react";

// [B#14] SÖZ DUVARI — isimsiz ilham cümleleri + kişinin kendi sözünü duvara
// açma/kapama anahtarı (opt-in, varsayılan kapalı).
export default function SozDuvariKarti({
  alintilar,
  duvarda,
}: {
  alintilar: string[];
  duvarda: boolean;
}) {
  const [acik, setAcik] = useState(duvarda);
  const [mesgul, setMesgul] = useState(false);

  async function degistir(yeni: boolean) {
    if (mesgul) return;
    setMesgul(true);
    setAcik(yeni); // iyimser
    try {
      const res = await fetch("/api/soz-duvari", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ duvarda: yeni }),
      });
      if (!res.ok) setAcik(!yeni); // geri al
    } catch {
      setAcik(!yeni);
    } finally {
      setMesgul(false);
    }
  }

  // Ne alıntı ne de anlamlı bir eylem varsa kartı gösterme.
  if (alintilar.length === 0 && !acik && duvarda === false) {
    // Yine de opt-in satırını göstermek değerli — kart kalsın ama sade.
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">🧱 Söz Duvarı</p>
      {alintilar.length > 0 ? (
        <ul className="mt-2 space-y-2">
          {alintilar.map((c, i) => (
            <li key={i} className="border-l-2 border-gold/30 pl-3 text-sm italic leading-relaxed text-slate-300">
              &ldquo;{c}&rdquo;
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-xs text-slate-500">
          Henüz duvarda paylaşılan söz yok. İlk sen olabilirsin.
        </p>
      )}
      <label className="mt-3 flex cursor-pointer items-center justify-between border-t border-white/10 pt-3">
        <span className="text-xs text-slate-400">Sözüm de duvarda (isimsiz) görünsün</span>
        <button
          type="button"
          role="switch"
          aria-checked={acik}
          onClick={() => void degistir(!acik)}
          disabled={mesgul}
          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
            acik ? "bg-gold" : "bg-white/15"
          } disabled:opacity-60`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
              acik ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
      </label>
    </section>
  );
}
