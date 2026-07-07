"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { tr } from "@/lib/i18n/tr";

const t = tr.admin.sahne;

type Dalga = { id: number; ad: string; acik: boolean; otomatik?: string | null };

export default function SahneKumanda({
  aynaAktif,
  vitrin,
  dalgalar,
}: {
  aynaAktif: boolean;
  vitrin: number | null;
  dalgalar: Dalga[];
}) {
  const router = useRouter();
  const [metin, setMetin] = useState("");
  const [mesgul, setMesgul] = useState<string | null>(null);
  const [hata, setHata] = useState(false);
  const [duyuruGitti, setDuyuruGitti] = useState(false);
  const [acilOnay, setAcilOnay] = useState(false);

  async function istek(
    anahtar: string,
    url: string,
    govde: Record<string, unknown>,
    bitince?: () => void
  ) {
    setMesgul(anahtar);
    setHata(false);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(govde),
      });
      if (!res.ok) {
        setHata(true);
        return;
      }
      bitince?.();
      router.refresh();
    } catch {
      setHata(true);
    } finally {
      setMesgul(null);
    }
  }

  function duyuruGonder(m: string) {
    const temiz = m.trim();
    if (temiz.length < 2) return;
    void istek("duyuru", "/api/admin/sahne", { eylem: "duyuru", metin: temiz }, () => {
      setMetin("");
      setDuyuruGitti(true);
      setTimeout(() => setDuyuruGitti(false), 4000);
    });
  }

  return (
    <div className="space-y-6">
      {hata && (
        <p role="alert" className="rounded-xl bg-red-500/10 p-3 text-sm font-medium text-red-300">
          {t.hata}
        </p>
      )}

      {/* 1) ANLIK DUYURU */}
      <section className="kart-3d rounded-2xl bg-midnight-card/60 p-6 shadow-xl ring-1 ring-gold/40 backdrop-blur">
        <h2 className="text-lg font-semibold text-gold-light">{t.duyuruBaslik}</h2>
        <p className="mt-1 text-sm text-slate-300">{t.duyuruAciklama}</p>
        <textarea
          value={metin}
          onChange={(e) => setMetin(e.target.value.slice(0, 200))}
          rows={2}
          placeholder={t.duyuruYer}
          className="mt-3 w-full rounded-xl border border-royal-light/30 bg-midnight-soft p-3 text-base text-slate-100 outline-none placeholder:text-slate-500 focus:border-gold"
        />
        <div className="mt-2 flex flex-wrap gap-2">
          {[t.hazir1, t.hazir2, t.hazir3].map((h) => (
            <button
              key={h}
              onClick={() => setMetin(h)}
              className="rounded-lg border border-white/15 px-2.5 py-1 text-xs text-slate-200 transition-colors hover:bg-white/[0.08]"
            >
              {h}
            </button>
          ))}
        </div>
        <button
          onClick={() => duyuruGonder(metin)}
          disabled={mesgul !== null || metin.trim().length < 2}
          className="mt-4 w-full btn-3d rounded-xl bg-gold px-4 py-4 text-lg font-bold text-[#1a1206] transition-colors hover:bg-gold-light disabled:opacity-40"
        >
          {mesgul === "duyuru" ? t.duyuruGonderiliyor : t.duyuruGonder}
        </button>
        {duyuruGitti && (
          <p className="mt-2 text-center text-sm font-semibold text-emerald-300">
            {t.duyuruGitti}
          </p>
        )}
      </section>

      {/* 2) AYNA DURAKLAT/SÜRDÜR */}
      <section className="kart-3d rounded-2xl bg-midnight-card/60 p-6 shadow-xl ring-1 ring-royal/30 backdrop-blur">
        <h2 className="text-lg font-semibold text-gold-light">{t.aynaBaslik}</h2>
        <p className={`mt-1 text-sm ${aynaAktif ? "text-emerald-300" : "text-slate-400"}`}>
          {aynaAktif ? t.aynaAktif : t.aynaPasif}
        </p>
        <button
          onClick={() =>
            void istek("ayna", "/api/admin/ayna-direktoru", {
              islem: "durum",
              aktif: !aynaAktif,
            })
          }
          disabled={mesgul !== null}
          className={`mt-4 w-full rounded-xl px-4 py-4 text-lg font-bold transition-colors disabled:opacity-50 ${
            aynaAktif
              ? "border-2 border-amber-400/50 text-amber-300 hover:bg-amber-400/10"
              : "btn-3d bg-gold text-[#1a1206] hover:bg-gold-light"
          }`}
        >
          {mesgul === "ayna" ? t.calisiyor : aynaAktif ? t.aynaDuraklat : t.aynaSurdur}
        </button>
      </section>

      {/* 3) DALGALAR */}
      <section className="kart-3d rounded-2xl bg-midnight-card/60 p-6 shadow-xl ring-1 ring-royal/30 backdrop-blur">
        <h2 className="text-lg font-semibold text-gold-light">{t.dalgaBaslik}</h2>
        <ul className="mt-3 space-y-2">
          {dalgalar.map((d) => (
            <li
              key={d.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5"
            >
              <span className="min-w-0 text-sm text-slate-200">
                <span>
                  {d.ad}
                  {d.acik && (
                    <span className="ml-2 rounded-md bg-emerald-400/15 px-2 py-0.5 text-xs font-semibold text-emerald-300">
                      {t.dalgaAcik}
                    </span>
                  )}
                </span>
                {!d.acik && d.otomatik && (
                  <span className="mt-0.5 block text-xs font-medium text-emerald-300/90">{d.otomatik}</span>
                )}
              </span>
              <button
                onClick={() =>
                  void istek(`dalga-${d.id}`, "/api/admin/dalga", {
                    dalgaId: d.id,
                    acik: !d.acik,
                  })
                }
                disabled={mesgul !== null}
                title={!d.acik && d.otomatik ? "Zamanı gelince kendi açılır; bu yalnızca erken açmak için." : undefined}
                className={`shrink-0 rounded-lg px-4 py-2 text-sm font-bold transition-colors disabled:opacity-50 ${
                  d.acik
                    ? "border border-amber-400/50 text-amber-300 hover:bg-amber-400/10"
                    : d.otomatik
                      ? "border border-royal-light/40 text-slate-300 hover:bg-midnight-soft"
                      : "btn-3d bg-gold text-[#1a1206] hover:bg-gold-light"
                }`}
              >
                {mesgul === `dalga-${d.id}`
                  ? t.calisiyor
                  : d.acik
                    ? t.dalgaKapat
                    : d.otomatik
                      ? "Erken aç"
                      : t.dalgaAc}
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* 3b) SAHNE VİTRİNİ — DJ kumandası: büyük ekranı bir slayda sabitle */}
      <section className="kart-3d rounded-2xl bg-midnight-card/60 p-6 shadow-xl ring-1 ring-royal/30 backdrop-blur">
        <h2 className="text-lg font-semibold text-gold-light">{t.vitrinBaslik}</h2>
        <p className="mt-1 text-sm text-slate-300">{t.vitrinAciklama}</p>
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {t.vitrinSlaytlar.map((ad, i) => {
            const aktif = vitrin === i;
            return (
              <button
                key={ad}
                onClick={() =>
                  void istek("vitrin", "/api/admin/sahne", {
                    eylem: "vitrin",
                    slayt: aktif ? null : i,
                  })
                }
                disabled={mesgul !== null}
                className={`flex items-center justify-between gap-2 rounded-xl px-4 py-3 text-left text-sm font-bold transition-colors disabled:opacity-50 ${
                  aktif
                    ? "btn-3d bg-gold text-[#1a1206]"
                    : "border border-white/15 text-slate-200 hover:bg-white/[0.06]"
                }`}
              >
                <span>{ad}</span>
                {aktif && <span className="text-xs">{t.vitrinSabit} ●</span>}
              </button>
            );
          })}
        </div>
        <button
          onClick={() => void istek("vitrin", "/api/admin/sahne", { eylem: "vitrin", slayt: null })}
          disabled={mesgul !== null || vitrin === null}
          className="mt-3 w-full rounded-xl border-2 border-emerald-400/40 px-4 py-3 text-sm font-bold text-emerald-300 transition-colors hover:bg-emerald-400/10 disabled:opacity-40"
        >
          {mesgul === "vitrin" ? t.calisiyor : `▶ ${t.vitrinOtomatik}`}
        </button>
      </section>

      {/* 4) ACİL DURDUR */}
      <section className="rounded-2xl border-2 border-red-500/40 bg-red-950/20 p-6">
        <h2 className="text-lg font-semibold text-red-300">{t.acilBaslik}</h2>
        <p className="mt-1 text-sm text-slate-300">{t.acilAciklama}</p>
        <button
          onClick={() => {
            if (!acilOnay) {
              setAcilOnay(true);
              setTimeout(() => setAcilOnay(false), 4000);
              return;
            }
            setAcilOnay(false);
            void istek("acil", "/api/admin/sahne", { eylem: "acil-durdur" });
          }}
          disabled={mesgul !== null}
          className="mt-4 w-full rounded-xl bg-red-600 px-4 py-4 text-lg font-bold text-white transition-colors hover:bg-red-500 disabled:opacity-50"
        >
          {mesgul === "acil" ? t.calisiyor : acilOnay ? t.acilOnay : t.acilDugme}
        </button>
      </section>
    </div>
  );
}
