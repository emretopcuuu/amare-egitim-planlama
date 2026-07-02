"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { tost } from "@/lib/tost";

// [M2/M3] Radar satırındaki "hatırlat" düğmesi — eksik kalanlara push + gelen
// kutusu dürtüsü gönderir. Push izni olmayanlar ayrıca bildirilir.
export default function OnboardingHatirlat({ hedef, eksik }: { hedef: "degerler" | "oyun"; eksik: number }) {
  const router = useRouter();
  const [mesgul, setMesgul] = useState(false);
  if (eksik === 0) return null;

  async function gonder() {
    if (mesgul) return;
    setMesgul(true);
    try {
      const r = await fetch("/api/admin/onboarding-hatirlat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ hedef }),
      });
      const v = await r.json().catch(() => null);
      if (r.ok && v?.ok) {
        const ek = v.pushsuz > 0 ? ` (${v.pushsuz} kişide push yok — WhatsApp'tan bak)` : "";
        tost(`${v.gonderildi} kişiye hatırlatıldı${ek}`, "basari");
        router.refresh();
      } else {
        tost("Hatırlatma gönderilemedi", "hata");
      }
    } catch {
      tost("Hatırlatma gönderilemedi", "hata");
    } finally {
      setMesgul(false);
    }
  }

  return (
    <button
      onClick={() => void gonder()}
      disabled={mesgul}
      className="shrink-0 rounded-lg border border-royal-light/40 px-3 py-1.5 text-xs font-semibold text-slate-200 transition-colors hover:bg-midnight-soft disabled:opacity-50"
    >
      {mesgul ? "Gönderiliyor…" : `${eksik} kişiye hatırlat`}
    </button>
  );
}
