"use client";

import { useState } from "react";
import { titret } from "@/lib/his";

// [3.1] Kamp arkadaşı tek dokunuş check-in butonu.
export default function KampArkadasiCheckin({ bugunYapildi }: { bugunYapildi: boolean }) {
  const [yapildi, setYapildi] = useState(bugunYapildi);
  const [mesgul, setMesgul] = useState(false);

  async function checkin() {
    if (mesgul || yapildi) return;
    setMesgul(true);
    try {
      const r = await fetch("/api/kamp-arkadasi", { method: "POST" });
      if (r.ok) {
        setYapildi(true);
        titret([10, 30, 10]);
      }
    } finally {
      setMesgul(false);
    }
  }

  if (yapildi) {
    return (
      <p className="mt-2 rounded-xl border border-emerald-400/25 bg-emerald-400/[0.06] p-2 text-center text-sm text-emerald-300">
        ✓ Bugün aradınız — kaydettim.
      </p>
    );
  }
  return (
    <button
      onClick={() => void checkin()}
      disabled={mesgul}
      className="btn-kor mt-2 flex h-11 w-full items-center justify-center rounded-xl text-sm font-bold disabled:opacity-40"
    >
      📞 Aradık / konuştuk
    </button>
  );
}
