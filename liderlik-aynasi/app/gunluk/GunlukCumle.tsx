"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { tr } from "@/lib/i18n/tr";
import { titret } from "@/lib/his";
import MikrofonButonu from "@/components/MikrofonButonu";
import Konfeti from "@/components/Konfeti";

const t = tr.gunlukCumle;

export default function GunlukCumle() {
  const [soru, setSoru] = useState("");
  const [notu, setNotu] = useState("");
  const [seri, setSeri] = useState(0);
  const [bugunVar, setBugunVar] = useState(false);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [kutla, setKutla] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  useEffect(() => {
    let iptal = false;
    fetch("/api/gunluk")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (iptal || !d) return;
        setSoru(d.soru ?? "");
        setSeri(d.seri ?? 0);
        if (d.bugunNotu) {
          setNotu(d.bugunNotu);
          setBugunVar(true);
        }
      })
      .catch(() => {})
      .finally(() => !iptal && setYukleniyor(false));
    return () => {
      iptal = true;
    };
  }, []);

  async function kaydet() {
    const metin = notu.trim();
    if (!metin || kaydediliyor) return;
    setKaydediliyor(true);
    setHata(null);
    try {
      const r = await fetch("/api/gunluk", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ notu: metin }),
      });
      const d = r.ok ? await r.json() : null;
      if (!d?.ok) {
        setHata(t.hata);
        return;
      }
      const yeni = !bugunVar;
      setSeri(d.seri ?? seri);
      setBugunVar(true);
      if (yeni) {
        titret([12, 40, 12]);
        setKutla(true);
      }
    } catch {
      setHata(t.hata);
    } finally {
      setKaydediliyor(false);
    }
  }

  return (
    <div className="flex min-h-[80vh] flex-col justify-center py-8">
      {kutla && <Konfeti />}
      <header className="text-center">
        <p className="text-4xl" aria-hidden>✍️</p>
        <h1 className="prizma-serif ay-metin mt-3 text-2xl font-semibold">{t.baslik}</h1>
        {seri > 0 && (
          <p className="parilti mt-2 inline-block rounded-full bg-gold/15 px-3 py-1 text-sm font-bold text-gold-light">
            🔥 {t.seriEtiket(seri)}
          </p>
        )}
      </header>

      {yukleniyor ? (
        <p className="mt-8 text-center text-sm text-slate-500">{t.yukleniyor}</p>
      ) : (
        <div className="mt-7">
          <p className="prizma-serif text-xl font-semibold leading-snug text-slate-50">{soru}</p>
          <textarea
            value={notu}
            onChange={(e) => setNotu(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder={t.yer}
            className="mt-4 w-full resize-none rounded-2xl border-2 border-white/20 bg-white/[0.04] p-4 text-lg leading-relaxed text-slate-100 outline-none placeholder:text-slate-500 focus:border-gold"
          />
          <div className="mt-3">
            <MikrofonButonu onMetin={(p) => setNotu((g) => (g.trim() ? `${g.trim()} ${p}` : p))} />
          </div>
          {hata && <p role="alert" className="mt-2 text-center text-sm font-medium text-red-400">{hata}</p>}
          <button
            onClick={kaydet}
            disabled={!notu.trim() || kaydediliyor}
            className="btn-kor parilti mt-5 flex h-14 w-full items-center justify-center rounded-2xl text-lg font-bold disabled:opacity-40"
          >
            {kaydediliyor ? t.kaydediliyor : bugunVar ? t.guncelle : t.kaydet}
          </button>
          {bugunVar && (
            <p aria-live="polite" className="mt-3 text-center text-sm text-emerald-400">
              {t.bugunTamam}
            </p>
          )}
        </div>
      )}

    </div>
  );
}
