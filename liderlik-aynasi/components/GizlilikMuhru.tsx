"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { tr } from "@/lib/i18n/tr";
import { useEsc } from "@/lib/useEsc";

const t = tr.gizlilikMuhru;

// GİZLİLİK MÜHRÜ — onboarding'in mahrem yüzeylerinde (Pusula sohbeti, Ön
// Farkındalık, Değerler, Hedef, Ritüel) hep aynı yerde duran sakin güven
// imzası: "🔒 Cevapların sana özel — admin dahil kimse okuyamaz". Bağırmaz;
// tekrar ede ede güven kurar. Dokununca KVKK ekranındaki üç garantiyi
// (kimse okumaz / yalnız AI işler / istediğin an silinir) küçük bir katmanda
// yeniden gösterir + Aydınlatma Metni linki.
export default function GizlilikMuhru({ hizala = "merkez" }: { hizala?: "merkez" | "sol" }) {
  const [acik, setAcik] = useState(false);
  useEsc(acik, () => setAcik(false));

  const katman = acik ? (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t.baslik}
      className="fixed inset-0 z-[85] flex items-end justify-center bg-black/60 p-4 sm:items-center"
      onClick={() => setAcik(false)}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-royal/40 bg-[#0a1522] p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-center text-2xl" aria-hidden>
          🔒
        </p>
        <h2 className="prizma-serif ay-metin mt-2 text-center text-xl font-bold">{t.baslik}</h2>
        <div className="mt-4 space-y-2.5">
          {tr.hazirlik.kvkk.maddeler.map((m) => (
            <div key={m.baslik} className="flex items-start gap-2.5 rounded-xl bg-white/[0.04] p-3">
              <span aria-hidden className="text-lg leading-none">
                {m.ikon}
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-100">{m.baslik}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-400">{m.metin}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-center text-xs text-slate-500">
          {t.linkOn}
          <Link href="/gizlilik" className="text-gold-light underline underline-offset-2">
            {t.link}
          </Link>
        </p>
        <button
          onClick={() => setAcik(false)}
          className="btn-kor mt-4 flex h-11 w-full items-center justify-center rounded-xl text-sm font-bold"
        >
          {t.kapat}
        </button>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setAcik(true)}
        className={`flex min-h-[44px] items-center gap-1.5 py-1 text-xs text-slate-500 transition-colors hover:text-slate-300 ${
          hizala === "merkez" ? "mx-auto justify-center text-center" : ""
        }`}
      >
        <span aria-hidden>🔒</span>
        <span className="underline-offset-4 hover:underline">{t.satir}</span>
      </button>
      {katman && typeof document !== "undefined" ? createPortal(katman, document.body) : null}
    </>
  );
}
