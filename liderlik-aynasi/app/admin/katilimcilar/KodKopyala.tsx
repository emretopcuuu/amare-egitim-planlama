"use client";

import { useRef, useState } from "react";

// Giriş kodunu tek dokunuşla panoya kopyalar — kayıt masasında elle seçim derdi biter.
export default function KodKopyala({ kod }: { kod: string }) {
  const [kopyalandi, setKopyalandi] = useState(false);
  const zamanlayici = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function kopyala() {
    try {
      await navigator.clipboard.writeText(kod);
      setKopyalandi(true);
      if (zamanlayici.current) clearTimeout(zamanlayici.current);
      zamanlayici.current = setTimeout(() => setKopyalandi(false), 1500);
    } catch {
      // pano erişimi yoksa sessiz kal — metin yine seçilebilir
    }
  }

  return (
    <button
      onClick={kopyala}
      title="Kopyala"
      className="rounded-md px-1.5 py-0.5 font-mono font-semibold text-gold-light transition-colors hover:bg-gold/10"
    >
      {kod} {kopyalandi ? "✓" : "⧉"}
    </button>
  );
}
