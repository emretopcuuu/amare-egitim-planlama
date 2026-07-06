"use client";

import { useState } from "react";
import { titret, cal } from "@/lib/his";

// [Şahitlik geliştirme #10] Şahidin alkışı karşılıksız kalmasın — tek
// dokunuşluk teşekkür, şahide anında push olarak gider.
export default function TesekkurButonu({ kudosId }: { kudosId: string }) {
  const [gonderildi, setGonderildi] = useState(false);
  const [gonderiliyor, setGonderiliyor] = useState(false);

  async function tesekkurEt() {
    if (gonderiliyor || gonderildi) return;
    setGonderiliyor(true);
    titret([12, 30, 12]);
    cal("kazanim");
    setGonderildi(true);
    try {
      const res = await fetch("/api/takdir/tesekkur", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kudosId }),
      });
      if (!res.ok) setGonderildi(false);
    } catch {
      setGonderildi(false);
    } finally {
      setGonderiliyor(false);
    }
  }

  if (gonderildi) {
    return <span className="text-xs font-medium text-emerald-300">🙏 Teşekkür edildi</span>;
  }
  return (
    <button
      onClick={tesekkurEt}
      disabled={gonderiliyor}
      className="rounded-lg bg-gold/15 px-2.5 py-1 text-xs font-medium text-gold-light hover:bg-gold/25 disabled:opacity-50"
    >
      🙏 Teşekkür et
    </button>
  );
}
