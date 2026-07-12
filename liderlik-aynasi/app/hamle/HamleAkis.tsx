"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { sesCal } from "@/lib/sesEfekti";

type Hamle = {
  id: string;
  rol: "cevapla" | "acildi" | "bekliyor";
  karsiAd: string;
  benimCumle: string | null;
  karsiCumle: string | null;
  sonSaat: string | null;
};

export default function HamleAkis({ hamleler }: { hamleler: Hamle[] }) {
  const router = useRouter();
  const [metinler, setMetinler] = useState<Record<string, string>>({});
  const [acilan, setAcilan] = useState<Record<string, string>>({}); // reveal edilen karşı cümle
  const [mesgul, setMesgul] = useState<string | null>(null);

  async function yanitla(id: string) {
    const cumle = (metinler[id] ?? "").trim();
    if (cumle.length < 2) return;
    setMesgul(id);
    try {
      const r = await fetch("/api/hamle", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ hamleId: id, cumle }),
      });
      const j = (await r.json().catch(() => ({}))) as { ok?: boolean; karsiCumle?: string | null };
      if (r.ok && j.ok) {
        sesCal("muhur");
        if (j.karsiCumle) setAcilan((a) => ({ ...a, [id]: j.karsiCumle! }));
        router.refresh();
      }
    } finally {
      setMesgul(null);
    }
  }

  if (hamleler.length === 0) {
    return (
      <section className="rounded-2xl border border-royal/20 bg-midnight-card/30 p-5 text-center text-sm text-slate-500">
        Şimdilik hamle sırası yok. Eşleşmeli bir görev tamamlanınca burada belirir.
      </section>
    );
  }

  return (
    <div className="space-y-3">
      {hamleler.map((h) => (
        <div key={h.id} className="rounded-2xl border border-royal/25 bg-midnight-card/40 p-4">
          {h.rol === "cevapla" && !acilan[h.id] ? (
            <>
              <p className="text-sm font-semibold text-gold-light">
                ♟ Sıra sende — {h.karsiAd} kendi tarafını yazdı{h.sonSaat ? ` · ⏳ ${h.sonSaat}'e kadar` : ""}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                🔒 {h.karsiAd}'nın cümlesi kilitli — sen de kendi tarafını anlat, ikiniz de görün.
              </p>
              <textarea
                value={metinler[h.id] ?? ""}
                onChange={(e) => setMetinler((m) => ({ ...m, [h.id]: e.target.value }))}
                rows={2}
                maxLength={400}
                placeholder="Bu karşılaşmadan senin cümlen…"
                className="mt-2 w-full resize-none rounded-xl border border-royal/40 bg-midnight/60 p-2.5 text-sm text-slate-100 outline-none focus:border-gold/50"
              />
              <button
                onClick={() => yanitla(h.id)}
                disabled={mesgul === h.id || (metinler[h.id] ?? "").trim().length < 2}
                className="btn-kor mt-2 h-11 w-full rounded-xl text-sm font-bold disabled:opacity-50"
              >
                {mesgul === h.id ? "Açılıyor…" : "🔓 Yaz ve karşılıklı aç"}
              </button>
            </>
          ) : h.rol === "acildi" || acilan[h.id] ? (
            <>
              <p className="text-sm font-semibold text-slate-100">{h.karsiAd} ile karşılıklı açıldı 🤝</p>
              <div className="mt-2 space-y-2">
                <div className="rounded-xl bg-royal/15 p-2.5">
                  <p className="text-[0.6rem] uppercase tracking-wide text-slate-500">Sen</p>
                  <p className="text-sm text-slate-200">{h.benimCumle ?? metinler[h.id]}</p>
                </div>
                <div className="rounded-xl bg-gold/[0.08] p-2.5">
                  <p className="text-[0.6rem] uppercase tracking-wide text-gold-light/70">{h.karsiAd}</p>
                  <p className="text-sm text-slate-200">{h.karsiCumle ?? acilan[h.id]}</p>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-400">
              ♟ {h.karsiAd}'ya hamleni bıraktın — karşılık verince ikiniz de göreceksiniz.
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
