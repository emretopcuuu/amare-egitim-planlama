"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { tr } from "@/lib/i18n/tr";

const t = tr.admin.gorevTuru;

export default function GorevTuruYonetim({
  turler,
  kapali,
}: {
  turler: string[];
  kapali: string[];
}) {
  const router = useRouter();
  const [kapaliSet, setKapaliSet] = useState<Set<string>>(new Set(kapali));
  const [mesgul, setMesgul] = useState(false);
  const [durum, setDurum] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  function degis(tur: string) {
    setDurum(null);
    setHata(null);
    setKapaliSet((s) => {
      const y = new Set(s);
      if (y.has(tur)) y.delete(tur);
      else y.add(tur);
      return y;
    });
  }

  async function kaydet() {
    if (mesgul) return;
    if (kapaliSet.size >= turler.length) {
      setHata(t.enAzBir);
      return;
    }
    setMesgul(true);
    setDurum(null);
    setHata(null);
    try {
      const res = await fetch("/api/admin/gorev-turleri", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kapali: [...kapaliSet] }),
      });
      if (!res.ok) {
        const v = (await res.json().catch(() => null)) as { hata?: string } | null;
        throw new Error(v?.hata);
      }
      setDurum(t.kayitli);
      router.refresh();
    } catch (e) {
      setHata((e as Error).message || t.hata);
    } finally {
      setMesgul(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {turler.map((tur) => {
          const bilgi = t.turler[tur as keyof typeof t.turler];
          const acik = !kapaliSet.has(tur);
          return (
            <div
              key={tur}
              className={`rounded-2xl border p-4 transition-colors ${
                acik
                  ? "border-royal/30 bg-midnight-card/60"
                  : "border-white/5 bg-midnight-card/20 opacity-60"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-gold-light">{bilgi?.ad ?? tur}</p>
                  <p className="mt-1 text-sm text-slate-300">{bilgi?.aciklama}</p>
                  <p className="mt-2 rounded-lg bg-black/20 p-2 text-xs italic text-slate-400">
                    “{bilgi?.ornek}”
                  </p>
                </div>
                <button
                  onClick={() => degis(tur)}
                  role="switch"
                  aria-checked={acik}
                  aria-label={bilgi?.ad ?? tur}
                  className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
                    acik ? "bg-emerald-500/70" : "bg-slate-600"
                  }`}
                >
                  <span
                    className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${
                      acik ? "left-6" : "left-1"
                    }`}
                  />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="sticky bottom-0 flex items-center gap-3 bg-midnight/85 py-3 backdrop-blur">
        <button
          onClick={kaydet}
          disabled={mesgul}
          className="btn-kor rounded-xl px-6 py-3 text-sm font-bold disabled:opacity-50"
        >
          {mesgul ? t.kaydediliyor : t.kaydet}
        </button>
        {durum && <span className="text-sm text-emerald-400">{durum}</span>}
        {hata && <span className="text-sm text-red-400">{hata}</span>}
      </div>
    </div>
  );
}
