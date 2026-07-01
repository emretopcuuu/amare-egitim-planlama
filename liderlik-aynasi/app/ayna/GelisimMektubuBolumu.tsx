"use client";

import { useState } from "react";

type Ozet = {
  hiza?: string;
  firsat?: string;
  tavsiye?: string;
  ilkAdim?: string;
};

// GELİŞİM MEKTUBU — kampsonu tavsiye mektubu. Değerler çalışması + kamptaki
// eylemler + arkadaş gözlemi sentezinden üretilir. Eleştiri değil gelişim:
// değer-davranış uyumu + fırsat + somut tavsiye + 90 gün ilk adım.
// Hazırsa doğrudan gösterilir; değilse istek üzerine üretilir.
export default function GelisimMektubuBolumu({
  mevcutMektup,
  mevcutOzet,
}: {
  mevcutMektup: string | null;
  mevcutOzet: Ozet | null;
}) {
  const [mektup, setMektup] = useState<string | null>(mevcutMektup);
  const [ozet, setOzet] = useState<Ozet | null>(mevcutOzet);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState(false);

  async function olustur() {
    if (yukleniyor) return;
    setYukleniyor(true);
    setHata(false);
    try {
      const res = await fetch("/api/gelisim-mektubu", { method: "POST" });
      if (!res.ok) {
        setHata(true);
        return;
      }
      const veri = await res.json();
      if (veri.yok) {
        // Değerler çalışması yapılmamış — bölümü sessizce gizle.
        setMektup(null);
        setHata(false);
        return;
      }
      setMektup(veri.mektup);
      setOzet(veri.ozet ?? null);
    } catch {
      setHata(true);
    } finally {
      setYukleniyor(false);
    }
  }

  // Tailwind dinamik sınıf üretemez → her rengin tam sınıfları statik yazılır.
  const ozetKartlar: { etiket: string; deger?: string; halka: string; yazi: string }[] = ozet
    ? [
        { etiket: "Değerini yaşadın", deger: ozet.hiza, halka: "ring-emerald-400/20", yazi: "text-emerald-300" },
        { etiket: "Bir sonraki eşiğin", deger: ozet.firsat, halka: "ring-amber-400/20", yazi: "text-amber-300" },
        { etiket: "Somut tavsiye", deger: ozet.tavsiye, halka: "ring-gold/25", yazi: "text-gold-light" },
        { etiket: "90 gün · ilk adım", deger: ozet.ilkAdim, halka: "ring-royal-light/20", yazi: "text-royal-light" },
      ].filter((k) => k.deger)
    : [];

  return (
    <section className="kart-cerceve rounded-2xl bg-gradient-to-br from-gold/20 to-midnight-card/60 p-5 shadow-xl ring-1 ring-gold/40 backdrop-blur">
      <h2 className="font-semibold text-gold-light">✍️ Sana Gelişim Mektubum</h2>
      <p className="mt-1 text-xs text-slate-400">
        Kamp öncesi seçtiğin değerlerinle, kampta yaşadıklarını ve arkadaşlarının
        gözünü bir araya getirdim.
      </p>

      {mektup ? (
        <>
          <div className="mt-4 whitespace-pre-wrap rounded-xl bg-midnight-soft/80 p-4 font-serif text-sm leading-relaxed text-slate-100">
            {mektup}
          </div>
          {ozetKartlar.length > 0 && (
            <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {ozetKartlar.map((k) => (
                <div
                  key={k.etiket}
                  className={`rounded-xl bg-white/[0.03] p-3 ring-1 ${k.halka}`}
                >
                  <p className={`text-[0.65rem] font-semibold uppercase tracking-wide ${k.yazi}`}>
                    {k.etiket}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-200">{k.deger}</p>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="mt-4">
          <button
            onClick={olustur}
            disabled={yukleniyor}
            className="btn-kor parilti flex h-12 w-full items-center justify-center rounded-2xl text-base font-bold disabled:opacity-60"
          >
            {yukleniyor ? "AYNA mektubunu yazıyor…" : "Gelişim Mektubumu Aç"}
          </button>
          {hata && (
            <p role="alert" className="mt-2 text-center text-sm font-medium text-amber-300">
              Mektup şu an açılamadı — birazdan tekrar dene.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
