"use client";

import { useState } from "react";
import Link from "next/link";
import { tr } from "@/lib/i18n/tr";
import type { SicakKisi, SicakDurum } from "@/lib/sicakListe";

const t = tr.sicakListe;
const DURUM_SIRA: SicakDurum[] = ["aday", "temas", "randevu", "kayit"];

export default function SicakListeClient({ baslangic }: { baslangic: SicakKisi[] }) {
  const [liste, setListe] = useState<SicakKisi[]>(baslangic);
  const [isim, setIsim] = useState("");
  const [mesgul, setMesgul] = useState(false);

  async function ekle() {
    const ad = isim.trim();
    if (!ad || mesgul) return;
    setMesgul(true);
    try {
      const r = await fetch("/api/sicak-liste", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ isim: ad }),
      });
      const d = await r.json();
      if (d?.kisi) {
        setListe((l) => [...l, d.kisi]);
        setIsim("");
      }
    } finally {
      setMesgul(false);
    }
  }

  async function durumIlerlet(k: SicakKisi) {
    const i = DURUM_SIRA.indexOf(k.durum as SicakDurum);
    const yeni = DURUM_SIRA[Math.min(i + 1, DURUM_SIRA.length - 1)];
    if (yeni === k.durum) return;
    setListe((l) => l.map((x) => (x.id === k.id ? { ...x, durum: yeni } : x)));
    await fetch("/api/sicak-liste", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: k.id, durum: yeni }),
    }).catch(() => {});
  }

  async function sil(k: SicakKisi) {
    setListe((l) => l.filter((x) => x.id !== k.id));
    await fetch("/api/sicak-liste", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: k.id }),
    }).catch(() => {});
  }

  const kayitSayi = liste.filter((k) => k.durum === "kayit").length;

  return (
    <main className="mx-auto w-full max-w-md flex-1 space-y-5 p-5">
      <Link href="/" className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200">
        ← {t.geri}
      </Link>
      <header>
        <h1 className="prizma-serif ay-metin text-2xl font-semibold">🔥 {t.baslik}</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">{t.aciklama}</p>
      </header>

      <div className="flex items-end gap-2">
        <input
          value={isim}
          onChange={(e) => setIsim(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && ekle()}
          placeholder={t.isimYer}
          className="min-h-[3rem] flex-1 rounded-2xl border border-royal-light/30 bg-midnight-soft px-4 py-3 text-base text-slate-100 outline-none focus:border-gold"
        />
        <button
          onClick={ekle}
          disabled={!isim.trim() || mesgul}
          className="btn-kor flex h-12 shrink-0 items-center justify-center rounded-2xl px-5 text-base font-bold disabled:opacity-40"
        >
          {t.ekle}
        </button>
      </div>

      {liste.length > 0 && (
        <p className="text-xs text-slate-500">
          {t.sayac(liste.length)}
          {kayitSayi > 0 && ` · ${t.kayitSayac(kayitSayi)}`}
        </p>
      )}

      <ul className="space-y-2">
        {liste.map((k) => (
          <li
            key={k.id}
            className="flex items-center gap-2 rounded-xl border border-royal-light/20 bg-midnight-soft/60 px-3 py-2.5"
          >
            <span className="min-w-0 flex-1 truncate text-base text-slate-100">{k.isim}</span>
            <button
              onClick={() => durumIlerlet(k)}
              className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${
                k.durum === "kayit"
                  ? "bg-emerald-500/20 text-emerald-300"
                  : k.durum === "pas"
                    ? "bg-white/5 text-slate-500"
                    : "bg-gold/15 text-gold-light hover:bg-gold/25"
              }`}
            >
              {t.durum[k.durum as SicakDurum]}
            </button>
            <button
              onClick={() => sil(k)}
              aria-label={t.sil}
              className="shrink-0 px-1 text-slate-500 hover:text-red-400"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>

      {liste.length === 0 && (
        <p className="rounded-2xl border border-royal-light/15 bg-white/[0.02] p-4 text-center text-sm text-slate-400">
          {t.bos}
        </p>
      )}
    </main>
  );
}
