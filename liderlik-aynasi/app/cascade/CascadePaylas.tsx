"use client";

import { useState } from "react";
import { titret } from "@/lib/his";

// [5.3] CASCADE KİTİ — istemci: kiti kopyala veya WhatsApp'tan paylaş.
export default function CascadePaylas({ metin }: { metin: string }) {
  const [kopyalandi, setKopyalandi] = useState(false);

  async function kopyala() {
    try {
      await navigator.clipboard.writeText(metin);
      setKopyalandi(true);
      titret([10, 30, 10]);
      setTimeout(() => setKopyalandi(false), 2000);
    } catch {
      /* pano yoksa kullanıcı WhatsApp butonunu kullanır */
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <a
        href={`https://wa.me/?text=${encodeURIComponent(metin)}`}
        target="_blank"
        rel="noreferrer"
        className="flex h-12 items-center justify-center rounded-2xl bg-emerald-500/20 text-base font-bold text-emerald-300"
      >
        📲 WhatsApp&apos;ta paylaş
      </a>
      <button
        onClick={() => void kopyala()}
        className="btn-kor flex h-12 w-full items-center justify-center rounded-2xl text-base font-bold"
      >
        {kopyalandi ? "Kopyalandı ✓" : "Kiti kopyala"}
      </button>
      <p className="text-center text-xs text-slate-500">
        Kiti sen paylaşıyorsun — sistem senin adına hiçbir şey göndermez.
      </p>
    </div>
  );
}
