"use client";

import { useState } from "react";

// Admin: bir Cumartesi grubunu ŞİMDİ görevlendir (Slice 3 manuel tetik).
// AYNA, grubun o anki etkinliğine özel görev üretir; sonucu kısa rapor eder.
export default function CumartesiGorevDugmesi({ grup }: { grup: number }) {
  const [yukleniyor, setYukleniyor] = useState(false);
  const [sonuc, setSonuc] = useState<string | null>(null);

  async function gonder() {
    setYukleniyor(true);
    setSonuc(null);
    try {
      const r = await fetch("/api/admin/cumartesi-gorev", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grup }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) {
        setSonuc(`⚠️ ${d?.hata ?? "Hata"}`);
      } else {
        const et = d.etkinlik ? ` · ${d.etkinlik}` : " · serbest";
        setSonuc(
          `✓ ${d.uretilen} görev üretildi${et}` +
            (d.atlanan ? ` (${d.atlanan} bekleyen atlandı)` : "")
        );
      }
    } catch {
      setSonuc("⚠️ Bağlantı hatası");
    } finally {
      setYukleniyor(false);
    }
  }

  return (
    <div className="mt-2">
      <button
        onClick={gonder}
        disabled={yukleniyor}
        className="rounded-lg bg-royal/40 px-3 py-1.5 text-xs font-semibold text-gold-light transition-colors hover:bg-royal/60 disabled:opacity-50"
      >
        {yukleniyor ? "Üretiliyor…" : "⚡ Şimdi görevlendir"}
      </button>
      {sonuc && <p className="mt-1.5 text-[0.7rem] text-slate-400">{sonuc}</p>}
    </div>
  );
}
