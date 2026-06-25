"use client";

import { useState } from "react";
import { titret } from "@/lib/his";

// #9 — Mentorluk seçimi. Önerilen 3 mentordan birini yapılandırılmış seçer
// (serbest metni okumaya gerek kalmadan kim-kimi mentor seçti izlenir).
export default function MentorSec({
  missionId,
  adaylar,
  secilen,
}: {
  missionId: string;
  adaylar: { id: string; ad: string }[];
  secilen: string | null;
}) {
  const [secim, setSecim] = useState<string | null>(secilen);
  const [calisiyor, setCalisiyor] = useState<string | null>(null);

  async function sec(id: string) {
    if (calisiyor) return;
    setCalisiyor(id);
    titret(8);
    try {
      const res = await fetch("/api/mentorluk-sec", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ missionId, mentorId: id }),
      });
      if (res.ok) {
        titret([8, 30]);
        setSecim(id);
      }
    } catch {
    } finally {
      setCalisiyor(null);
    }
  }

  return (
    <div className="mt-3 rounded-xl border border-royal-light/25 bg-midnight/40 p-3">
      <p className="text-xs font-semibold text-gold-light">Mentorunu seç</p>
      <div className="mt-2 grid gap-2">
        {adaylar.map((a) => {
          const aktif = secim === a.id;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => sec(a.id)}
              disabled={!!calisiyor}
              aria-pressed={aktif}
              className={`bas-his flex items-center justify-between rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors disabled:opacity-50 ${
                aktif
                  ? "border-gold/50 bg-gold/15 text-gold-light"
                  : "border-royal-light/30 text-slate-200 hover:border-gold/40"
              }`}
            >
              <span>{a.ad}</span>
              <span aria-hidden>{aktif ? "✓" : calisiyor === a.id ? "…" : ""}</span>
            </button>
          );
        })}
      </div>
      {secim && (
        <p className="mt-2 text-xs text-emerald-400">
          ✓ Seçildi — bul, 15 dk konuş, sonra aşağıya yaz.
        </p>
      )}
    </div>
  );
}
