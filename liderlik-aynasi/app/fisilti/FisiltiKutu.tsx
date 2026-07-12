"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { sesCal } from "@/lib/sesEfekti";

type Gelen = {
  id: string;
  kilitli: boolean;
  anonim: boolean;
  gonderenAd: string | null;
  sesUrl: string | null;
  dinlendi: boolean;
  tahminDurumu: "yok" | "dogru" | "yanlis";
};
type Secenek = { id: string; ad: string };

// G5 — gelen fısıltılar: kilitli → "1 görev tamamla"; açık → dinle → (anonimse)
// "kim söyledi?" tahmin oyunu.
export default function FisiltiKutu({ gelenler }: { gelenler: Gelen[] }) {
  const router = useRouter();
  const [secenekler, setSecenekler] = useState<Record<string, Secenek[]>>({});
  const [sonuc, setSonuc] = useState<Record<string, { dogru: boolean; ad: string | null }>>({});
  const [mesgul, setMesgul] = useState<string | null>(null);

  async function dinle(id: string) {
    setMesgul(id);
    try {
      const r = await fetch("/api/fisilti/dinle", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ fisiltiId: id }),
      });
      const j = (await r.json().catch(() => ({}))) as { secenekler?: Secenek[] | null };
      if (j.secenekler) setSecenekler((s) => ({ ...s, [id]: j.secenekler! }));
    } finally {
      setMesgul(null);
    }
  }

  async function tahmin(id: string, tahminId: string) {
    setMesgul(id);
    try {
      const r = await fetch("/api/fisilti/tahmin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ fisiltiId: id, tahminId }),
      });
      const j = (await r.json().catch(() => ({}))) as { dogru?: boolean; gonderenAd?: string | null };
      sesCal(j.dogru ? "fiero" : "kart-ac");
      setSonuc((s) => ({ ...s, [id]: { dogru: !!j.dogru, ad: j.gonderenAd ?? null } }));
      setSecenekler((s) => {
        const n = { ...s };
        delete n[id];
        return n;
      });
      router.refresh();
    } finally {
      setMesgul(null);
    }
  }

  if (gelenler.length === 0) {
    return (
      <section className="rounded-2xl border border-royal/20 bg-midnight-card/30 p-5 text-center text-sm text-slate-500">
        Henüz sana fısıltı gelmedi. Biri geldiğinde burada belirir.
      </section>
    );
  }

  return (
    <section className="space-y-2">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Gelen fısıltılar</p>
      {gelenler.map((f) => (
        <div key={f.id} className="rounded-2xl border border-royal/25 bg-midnight-card/40 p-3.5">
          {f.kilitli ? (
            <p className="text-sm text-slate-300">🔒 Kilitli — açmak için 1 görev tamamla.</p>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-slate-100">
                  {f.anonim ? (sonuc[f.id]?.ad ?? f.gonderenAd ?? "Anonim fısıltı") : `${f.gonderenAd ?? "Biri"} dedi ki`}
                </span>
                {f.tahminDurumu === "dogru" && <span className="text-xs text-emerald-400">✓ doğru bildin</span>}
                {f.tahminDurumu === "yanlis" && <span className="text-xs text-slate-500">tahmin yanlıştı</span>}
              </div>
              {f.sesUrl && (
                <audio controls src={f.sesUrl} onPlay={() => !f.dinlendi && dinle(f.id)} className="w-full" />
              )}
              {/* Tahmin şıkları (anonim, henüz tahmin yok) */}
              {secenekler[f.id] && (
                <div className="space-y-1.5">
                  <p className="text-xs text-gold-light">Kim söyledi?</p>
                  <div className="grid grid-cols-1 gap-1.5">
                    {secenekler[f.id].map((s) => (
                      <button
                        key={s.id}
                        onClick={() => tahmin(f.id, s.id)}
                        disabled={mesgul === f.id}
                        className="rounded-xl border border-royal/30 px-3 py-2 text-sm text-slate-200 hover:border-gold disabled:opacity-50"
                      >
                        {s.ad}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {sonuc[f.id] && (
                <p className={`text-sm ${sonuc[f.id].dogru ? "text-emerald-400" : "text-slate-400"}`}>
                  {sonuc[f.id].dogru
                    ? `🎉 Doğru! ${sonuc[f.id].ad ? sonuc[f.id].ad + " söylemiş — " : ""}ikinize de kıvılcım.`
                    : "Bu sefer olmadı — ama fısıltı senindi."}
                </p>
              )}
              {f.anonim && !secenekler[f.id] && !sonuc[f.id] && f.tahminDurumu === "yok" && !f.dinlendi && (
                <p className="text-xs text-slate-500">Dinle, sonra kim söyledi tahmin et.</p>
              )}
            </div>
          )}
        </div>
      ))}
    </section>
  );
}
