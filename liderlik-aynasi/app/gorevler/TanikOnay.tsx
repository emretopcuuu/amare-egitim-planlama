"use client";

import { useState } from "react";
import { tr } from "@/lib/i18n/tr";
import { titret } from "@/lib/his";
import MikrofonButonu from "@/components/MikrofonButonu";

const t = tr.gorevler;

// #5 Tanık onayı: bu kişiye gelen bir tanıklık çağrısı. Tek cümle gözlem yazar;
// gözlem adaya ANONİM gider. Gönderince kart kapanır.
export default function TanikOnay({
  tanikId,
  doerAd,
}: {
  tanikId: string;
  doerAd: string;
}) {
  const [metin, setMetin] = useState("");
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [bitti, setBitti] = useState(false);

  async function gonder() {
    if (metin.trim().length < 2 || gonderiliyor) return;
    setGonderiliyor(true);
    try {
      const res = await fetch("/api/tanik-onay", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tanikId, gozlem: metin.trim() }),
      });
      if (res.ok) {
        titret([10, 30, 10]);
        setBitti(true);
      }
    } catch {
    } finally {
      setGonderiliyor(false);
    }
  }

  if (bitti) {
    return <p className="text-sm font-medium text-emerald-300">{t.tanikOnaylandi}</p>;
  }
  return (
    <div>
      <p className="text-sm text-slate-200">{t.tanikBekleyenSatir(doerAd)}</p>
      <textarea
        value={metin}
        onChange={(e) => setMetin(e.target.value)}
        rows={2}
        maxLength={400}
        disabled={gonderiliyor}
        placeholder={t.tanikGozlemYer}
        className="mt-2 w-full rounded-xl border border-royal-light/30 bg-midnight-soft p-3 text-base text-slate-100 outline-none transition-colors placeholder:text-slate-500 focus:border-gold"
      />
      <div className="mt-2 flex gap-2">
        <MikrofonButonu
          disabled={gonderiliyor}
          onMetin={(parca) => setMetin((y) => (y.trim() ? `${y.trim()} ${parca}` : parca))}
        />
        <button
          type="button"
          onClick={gonder}
          disabled={metin.trim().length < 2 || gonderiliyor}
          className="h-11 flex-1 rounded-xl bg-gold font-semibold text-[#1a1206] transition-colors hover:bg-gold-light disabled:opacity-40"
        >
          {gonderiliyor ? t.tanikOnaylaniyor : t.tanikOnayla}
        </button>
      </div>
    </div>
  );
}
