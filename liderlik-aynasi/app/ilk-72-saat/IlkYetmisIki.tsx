"use client";

import { useState } from "react";
import { titret } from "@/lib/his";

// [E2] İstemci: 3 mikro adım + her birine gün+saat seçimi. Varsayılan zamanlar
// önümüzdeki 72 saate yayılı; kişi değiştirir. Kaydedince kişisel push zamanlanır.
function yerelStr(offsetSaat: number): string {
  const d = new Date(Date.now() + offsetSaat * 3_600_000);
  d.setMinutes(0, 0, 0);
  // datetime-local için YYYY-MM-DDTHH:mm (yerel).
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export default function IlkYetmisIki({
  adimlar,
  mevcut,
}: {
  adimlar: string[];
  mevcut: { adim: number; planlanan_zaman: string; durum: string }[];
}) {
  const varsayilan = [4, 24, 48];
  const mevcutMap = new Map(mevcut.map((m) => [m.adim, m.planlanan_zaman]));
  // [Düzeltme] "Yaptım ✓" durumu (adim → yapıldı mı). Push /gorevler yerine buraya
  // gelir; kişi taahhüdünü burada kapatır.
  const [yapildiMap, setYapildiMap] = useState<Record<number, boolean>>(() =>
    Object.fromEntries(mevcut.filter((m) => m.durum === "yapildi").map((m) => [m.adim, true]))
  );
  const [tamamMesgul, setTamamMesgul] = useState<number | null>(null);
  async function taahhutIsaretle(adim: number, yapildi: boolean) {
    setTamamMesgul(adim);
    setYapildiMap((y) => ({ ...y, [adim]: yapildi }));
    try {
      const r = await fetch("/api/ilk-72-saat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tamamla: { adim, yapildi } }),
      });
      if (r.ok && yapildi) titret([12, 40, 30]);
      if (!r.ok) setYapildiMap((y) => ({ ...y, [adim]: !yapildi }));
    } catch {
      setYapildiMap((y) => ({ ...y, [adim]: !yapildi }));
    } finally {
      setTamamMesgul(null);
    }
  }
  const [zamanlar, setZamanlar] = useState<string[]>(
    adimlar.map((_, i) => {
      const v = mevcutMap.get(i + 1);
      if (v) {
        // ISO → yerel datetime-local
        const d = new Date(v);
        const p = (n: number) => String(n).padStart(2, "0");
        return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
      }
      return yerelStr(varsayilan[i] ?? 24);
    })
  );
  const [durum, setDurum] = useState<"bos" | "kaydediliyor" | "kaydedildi" | "hata">(
    mevcut.length > 0 ? "kaydedildi" : "bos"
  );

  function zamanGuncelle(i: number, v: string) {
    setZamanlar((z) => z.map((x, j) => (j === i ? v : x)));
    setDurum("bos");
  }

  async function kaydet() {
    if (durum === "kaydediliyor") return;
    setDurum("kaydediliyor");
    const girdiler = adimlar.map((metin, i) => ({
      adim: i + 1,
      metin,
      planlanan_zaman: new Date(zamanlar[i]).toISOString(),
    }));
    try {
      const r = await fetch("/api/ilk-72-saat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ adimlar: girdiler }),
      });
      if (r.ok) {
        setDurum("kaydedildi");
        titret([12, 40, 12, 40, 30]);
      } else {
        setDurum("hata");
      }
    } catch {
      setDurum("hata");
    }
  }

  return (
    <div className="space-y-3">
      {adimlar.map((metin, i) => {
        const adim = i + 1;
        const yapildi = !!yapildiMap[adim];
        return (
          <div
            key={i}
            className={`rounded-2xl border p-4 ${
              yapildi ? "border-emerald-400/40 bg-emerald-500/[0.07]" : "border-gold/25 bg-midnight-card/60"
            }`}
          >
            <div className="flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gold/20 text-sm font-bold text-gold-light">
                {adim}
              </span>
              <p className={`text-sm leading-relaxed ${yapildi ? "text-slate-400 line-through" : "text-slate-200"}`}>
                {metin}
              </p>
            </div>
            <label className="mt-3 block text-xs font-medium text-slate-400">Ne zaman yapacaksın?</label>
            <input
              type="datetime-local"
              value={zamanlar[i]}
              onChange={(e) => zamanGuncelle(i, e.target.value)}
              disabled={yapildi}
              className="mt-1 h-11 w-full rounded-xl border-2 border-white/15 bg-white/[0.04] px-3 text-sm text-slate-100 outline-none focus:border-gold disabled:opacity-50"
            />
            {/* Yaptım ✓ — taahhüdü sahada yaptıysan burada kapat */}
            <button
              onClick={() => void taahhutIsaretle(adim, !yapildi)}
              disabled={tamamMesgul === adim}
              className={`mt-2 flex h-9 w-full items-center justify-center rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 ${
                yapildi
                  ? "bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
                  : "border border-emerald-400/40 text-emerald-300 hover:bg-emerald-500/10"
              }`}
            >
              {yapildi ? "✓ Yaptım (geri al)" : "Yaptım ✓"}
            </button>
          </div>
        );
      })}
      {durum === "hata" && <p className="text-center text-sm text-rose-300">Kaydedilemedi (zamanlar 72 saat içinde olmalı). Tekrar dene.</p>}
      <button
        onClick={() => void kaydet()}
        disabled={durum === "kaydediliyor"}
        className="btn-kor parilti flex h-12 w-full items-center justify-center rounded-2xl text-base font-bold disabled:opacity-50"
      >
        {durum === "kaydediliyor" ? "Kaydediliyor…" : durum === "kaydedildi" ? "Planım kuruldu ✓ (değiştirebilirsin)" : "Bu 3 anı kilitle"}
      </button>
      {durum === "kaydedildi" && (
        <p className="text-center text-xs text-slate-500">Seçtiğin saatlerde AYNA sana hatırlatacak.</p>
      )}
    </div>
  );
}
