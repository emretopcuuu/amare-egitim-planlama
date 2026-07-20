"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { tr } from "@/lib/i18n/tr";
import { titret } from "@/lib/his";
import MikrofonButonu from "@/components/MikrofonButonu";

const t = tr.grup;

// Grup ödevi kapanışı (öneri #4): bir üye "biz bunu yaptık" + kısa kanıt yazar
// → ödev kapanır, gruba toplu kıvılcım yazılır. Çift dokunuş guard'lı.
export default function GrupOdevTamam({ odevId }: { odevId: string }) {
  const router = useRouter();
  const [acik, setAcik] = useState(false);
  const [kanit, setKanit] = useState("");
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [bitti, setBitti] = useState(false);
  const [hata, setHata] = useState(false);

  async function gonder() {
    if (gonderiliyor || kanit.trim().length < 3) return;
    setGonderiliyor(true);
    setHata(false);
    try {
      const r = await fetch("/api/grup-odev-tamam", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ odevId, kanit }),
      });
      const d = await r.json().catch(() => null);
      if (r.ok && d?.ok) {
        titret([15, 40, 15, 40, 30]);
        setBitti(true);
        router.refresh();
        return;
      }
      setHata(true);
    } catch {
      setHata(true);
    } finally {
      setGonderiliyor(false);
    }
  }

  if (bitti) {
    return <p className="mt-4 rounded-xl bg-emerald-500/10 px-4 py-3 text-center text-sm font-medium text-emerald-300">{t.tamamOldu}</p>;
  }

  if (!acik) {
    return (
      <button
        onClick={() => setAcik(true)}
        className="mt-4 flex h-11 w-full items-center justify-center rounded-xl border border-gold/40 text-sm font-semibold text-gold-light transition-colors hover:bg-gold/10"
      >
        {t.tamamButon}
      </button>
    );
  }

  return (
    <div className="mt-4 space-y-3 rounded-xl border border-gold/25 bg-midnight-soft/60 p-3">
      <textarea
        value={kanit}
        onChange={(e) => setKanit(e.target.value)}
        rows={3}
        placeholder={t.tamamYerTutucu}
        className="w-full resize-none rounded-xl border-2 border-white/15 bg-white/[0.04] p-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-gold"
      />
      <MikrofonButonu
        onMetin={(p) => setKanit((g) => (g.trim() ? `${g.trim()} ${p}` : p))}
      />
      {hata && <p className="text-xs text-red-400">{t.tamamHata}</p>}
      <div className="flex gap-2">
        <button
          onClick={() => setAcik(false)}
          disabled={gonderiliyor}
          className="h-10 flex-1 rounded-xl border border-white/15 text-sm text-slate-300 transition-colors hover:bg-white/5 disabled:opacity-50"
        >
          {t.tamamVazgec}
        </button>
        <button
          onClick={() => void gonder()}
          disabled={gonderiliyor || kanit.trim().length < 3}
          className="btn-kor h-10 flex-[2] rounded-xl text-sm font-bold disabled:opacity-40"
        >
          {gonderiliyor ? t.tamamGonderiliyor : t.tamamGonder}
        </button>
      </div>
    </div>
  );
}
