"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { tr } from "@/lib/i18n/tr";

const t = tr.admin.test;

type Demo = { id: string; ad: string; kod: string };

// Hızlı prova anları: her kamp günü için sabah / senkron öğle / gece.
const ANLAR: { etiket: string; saat: string }[] = [
  { etiket: "Sabah 07:30", saat: "07:30" },
  { etiket: "Senkron 12:00", saat: "12:00" },
  { etiket: "Öğle fısıltı 13:00", saat: "13:00" },
  { etiket: "Akşam 20:00", saat: "20:00" },
  { etiket: "Gece 23:45", saat: "23:45" },
];

export default function TestPaneli({
  demolar,
  kampGunleri,
}: {
  demolar: Demo[];
  kampGunleri: string[];
}) {
  const router = useRouter();
  // datetime-local varsayılanı: 1. kamp günü 07:30
  const [an, setAn] = useState(`${kampGunleri[0]}T07:30`);
  const [mesgul, setMesgul] = useState<string | null>(null);
  const [sonuc, setSonuc] = useState<string | null>(null);
  const [yeniKod, setYeniKod] = useState<string | null>(null);
  const [hata, setHata] = useState(false);

  async function eylemGonder(eylem: string, ekstra?: Record<string, unknown>) {
    setMesgul(eylem);
    setHata(false);
    setSonuc(null);
    setYeniKod(null);
    try {
      const res = await fetch("/api/admin/test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ eylem, ...ekstra }),
      });
      const veri = await res.json().catch(() => null);
      if (!res.ok) {
        setHata(true);
        return;
      }
      if (eylem === "tik") setSonuc(JSON.stringify(veri.sonuc, null, 2));
      if (eylem === "demo-olustur" && veri.kod) setYeniKod(veri.kod);
      router.refresh();
    } catch {
      setHata(true);
    } finally {
      setMesgul(null);
    }
  }

  // datetime-local (yerel duvar saati) → İstanbul saati olarak yorumla
  function tikGonder() {
    void eylemGonder("tik", { zaman: `${an}:00+03:00` });
  }

  return (
    <div className="space-y-6">
      {hata && (
        <p role="alert" className="rounded-xl bg-red-500/10 p-3 text-sm font-medium text-red-300">
          {t.hata}
        </p>
      )}

      {/* 1) SAAT YOLCULUĞU */}
      <section className="kart-3d rounded-2xl bg-midnight-card/60 p-6 shadow-xl ring-1 ring-gold/40 backdrop-blur">
        <h2 className="text-lg font-semibold text-gold-light">{t.saatBaslik}</h2>
        <p className="mt-1 text-sm text-slate-300">{t.saatAciklama}</p>

        <label className="mt-4 block text-xs font-medium uppercase tracking-wide text-slate-400">
          {t.saatEtiket}
        </label>
        <input
          type="datetime-local"
          value={an}
          onChange={(e) => setAn(e.target.value)}
          className="mt-1 w-full rounded-xl border border-royal-light/30 bg-midnight-soft p-3 text-base text-slate-100 outline-none focus:border-gold"
        />

        <p className="mt-4 text-xs font-medium uppercase tracking-wide text-slate-400">
          {t.onerilenler}
        </p>
        <div className="mt-2 space-y-2">
          {kampGunleri.map((gun, i) => (
            <div key={gun} className="flex flex-wrap gap-2">
              <span className="self-center text-xs font-bold text-royal-light">
                Gün {i + 1}
              </span>
              {ANLAR.map((a) => (
                <button
                  key={a.etiket}
                  onClick={() => setAn(`${gun}T${a.saat}`)}
                  className="rounded-lg border border-white/15 px-2.5 py-1 text-xs text-slate-200 transition-colors hover:bg-white/[0.08]"
                >
                  {a.etiket}
                </button>
              ))}
            </div>
          ))}
        </div>

        <button
          onClick={tikGonder}
          disabled={mesgul !== null}
          className="mt-5 w-full btn-3d rounded-xl bg-gold px-4 py-3 font-semibold text-midnight transition-colors hover:bg-gold-light disabled:opacity-50"
        >
          {mesgul === "tik" ? t.tikCalisiyor : t.tikCalistir}
        </button>

        {sonuc && (
          <div className="mt-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              {t.sonucBaslik}
            </p>
            <pre className="mt-1 overflow-x-auto rounded-xl bg-black/40 p-3 text-xs text-emerald-300">
              {sonuc}
            </pre>
          </div>
        )}
      </section>

      {/* 2) DEMO KATILIMCI */}
      <section className="kart-3d rounded-2xl bg-midnight-card/60 p-6 shadow-xl ring-1 ring-royal/30 backdrop-blur">
        <h2 className="text-lg font-semibold text-gold-light">{t.demoBaslik}</h2>
        <p className="mt-1 text-sm text-slate-300">{t.demoAciklama}</p>

        <button
          onClick={() => void eylemGonder("demo-olustur")}
          disabled={mesgul !== null}
          className="mt-4 w-full btn-3d rounded-xl bg-gold px-4 py-3 font-semibold text-midnight transition-colors hover:bg-gold-light disabled:opacity-50"
        >
          {mesgul === "demo-olustur" ? t.calisiyor : t.demoOlustur}
        </button>
        {yeniKod && (
          <p className="mt-3 rounded-xl bg-emerald-500/10 p-3 text-center text-base font-bold text-emerald-300">
            {t.demoKod(yeniKod)}
          </p>
        )}

        <p className="mt-5 text-xs font-medium uppercase tracking-wide text-slate-400">
          {t.demoListeBaslik}
        </p>
        {demolar.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">{t.demoYok}</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {demolar.map((d) => (
              <li
                key={d.id}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5"
              >
                <span className="text-sm text-slate-200">{d.ad}</span>
                <span className="font-mono text-lg font-bold text-gold">{d.kod}</span>
              </li>
            ))}
          </ul>
        )}
        {demolar.length > 0 && (
          <button
            onClick={() => void eylemGonder("demo-sil")}
            disabled={mesgul !== null}
            className="mt-4 w-full rounded-xl border border-red-400/30 px-4 py-2.5 text-sm font-semibold text-red-300 transition-colors hover:bg-red-400/10 disabled:opacity-50"
          >
            {mesgul === "demo-sil" ? t.calisiyor : t.demoSil}
          </button>
        )}
      </section>

      {/* 3) PENCERELERİ SIFIRLA */}
      <section className="kart-3d rounded-2xl bg-midnight-card/60 p-6 shadow-xl ring-1 ring-royal/30 backdrop-blur">
        <h2 className="text-lg font-semibold text-gold-light">{t.kilitBaslik}</h2>
        <p className="mt-1 text-sm text-slate-300">{t.kilitAciklama}</p>
        <button
          onClick={() => void eylemGonder("kilit-temizle")}
          disabled={mesgul !== null}
          className="mt-4 w-full rounded-xl border border-white/20 px-4 py-2.5 text-sm font-semibold text-slate-100 transition-colors hover:bg-white/[0.08] disabled:opacity-50"
        >
          {mesgul === "kilit-temizle" ? t.calisiyor : t.kilitTemizle}
        </button>
      </section>
    </div>
  );
}
