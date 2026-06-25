"use client";

import { useState } from "react";
import Link from "next/link";
import { tr } from "@/lib/i18n/tr";

const t = tr.takip;

type Durum = {
  bugunYapildi: boolean | null;
  seri: number;
  toplam: number;
  son14: { gun: string; yapildi: boolean | null }[];
  kacirilanGun: number;
};
type Aksiyon = { metin: string; ufuk: string };

export default function TakipAkis({
  durum: durumBaslangic,
  aksiyonlar,
}: {
  durum: Durum;
  aksiyonlar: Aksiyon[];
}) {
  const [durum, setDurum] = useState<Durum>(durumBaslangic);
  const [not, setNot] = useState("");
  const [mesgul, setMesgul] = useState(false);

  async function checkin(yapildi: boolean) {
    setMesgul(true);
    try {
      const res = await fetch("/api/soz-takip", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ yapildi, notlar: not }),
      });
      const v = await res.json().catch(() => null);
      if (res.ok && v?.durum) {
        setDurum(v.durum);
        setNot("");
      }
    } finally {
      setMesgul(false);
    }
  }

  const isaretli = durum.bugunYapildi !== null;

  return (
    <div className="mx-auto my-auto w-full max-w-md space-y-5 p-5">
      <header className="text-center">
        <p className="prizma-serif text-[0.7rem] uppercase tracking-[0.35em] text-slate-400">
          {tr.app.name}
        </p>
        <h1 className="prizma-serif ay-metin mt-1 text-2xl font-semibold">{t.baslik}</h1>
        <p className="mt-2 text-sm text-slate-300">{t.aciklama}</p>
      </header>

      {/* Seri + toplam */}
      <div className="flex gap-3">
        <div className="flex-1 rounded-2xl bg-gold/10 p-4 text-center">
          <p className="text-2xl font-bold text-gold">{durum.seri}</p>
          <p className="text-xs text-slate-400">{durum.seri > 0 ? t.seri(durum.seri) : t.seriYok}</p>
        </div>
        <div className="flex-1 rounded-2xl bg-emerald-500/10 p-4 text-center">
          <p className="text-2xl font-bold text-emerald-300">{durum.toplam}</p>
          <p className="text-xs text-slate-400">{t.toplam(durum.toplam)}</p>
        </div>
      </div>

      {/* B8: 90 günlük genel ilerleme — kaç gün tamamlandı, ne kadar kaldı */}
      <div className="rounded-2xl border border-royal/25 bg-midnight-card/50 p-4">
        <div className="flex items-center justify-between text-xs font-medium text-slate-400">
          <span>{t.yolBaslik}</span>
          <span className="text-gold-light">{t.yolGun(Math.min(durum.toplam, 90))}</span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-royal-light to-gold transition-all duration-700"
            style={{ width: `${Math.min(100, Math.round((durum.toplam / 90) * 100))}%` }}
          />
        </div>
      </div>

      {/* Bugünün check-in'i */}
      <section className="kart-cam rounded-2xl p-5">
        {isaretli ? (
          <p className="text-center text-base font-semibold text-emerald-300">{t.bugunTamam}</p>
        ) : (
          <>
            <p className="text-base font-medium text-slate-100">{t.bugunSoru}</p>
            <textarea
              value={not}
              onChange={(e) => setNot(e.target.value.slice(0, 500))}
              rows={2}
              placeholder={t.notYer}
              className="mt-3 w-full resize-none rounded-xl border border-royal-light/30 bg-midnight-soft px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-gold"
            />
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => checkin(true)}
                disabled={mesgul}
                className="btn-kor flex h-12 flex-1 items-center justify-center rounded-xl text-base font-bold disabled:opacity-50"
              >
                {t.evet}
              </button>
              <button
                onClick={() => checkin(false)}
                disabled={mesgul}
                className="flex h-12 flex-1 items-center justify-center rounded-xl border border-royal-light/40 text-sm font-medium text-slate-300 hover:bg-midnight-soft disabled:opacity-50"
              >
                {t.hayir}
              </button>
            </div>
          </>
        )}
      </section>

      {/* Son 14 gün şeridi */}
      <section className="kart-cam rounded-2xl p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t.son14}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {durum.son14.map((g) => (
            <span
              key={g.gun}
              title={g.gun}
              className={`flex h-7 w-7 items-center justify-center rounded-md text-xs font-bold ${
                g.yapildi === true
                  ? "bg-emerald-500/80 text-[#04140c]"
                  : g.yapildi === false
                    ? "bg-red-500/30 text-red-200"
                    : "bg-white/5 text-slate-600"
              }`}
            >
              {g.yapildi === true ? "✓" : g.yapildi === false ? "·" : ""}
            </span>
          ))}
        </div>
      </section>

      {/* Sözündeki adımlar */}
      {aksiyonlar.length > 0 && (
        <section className="kart-cam rounded-2xl p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {t.aksiyonHatirlatma}
          </p>
          <ul className="mt-2 space-y-1.5">
            {aksiyonlar.map((a, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-200">
                <span className="shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[0.6rem] font-bold text-emerald-300">
                  {tr.sozV2.ufukEtiket(a.ufuk)}
                </span>
                <span>{a.metin}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="text-center">
        <Link href="/" className="text-sm text-slate-400 underline-offset-4 hover:text-slate-200 hover:underline">
          {t.anaSayfa}
        </Link>
      </p>
    </div>
  );
}
