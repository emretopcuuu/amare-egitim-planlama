"use client";

import { useEffect, useRef, useState } from "react";
import { tr } from "@/lib/i18n/tr";
import AynaDusunuyor from "@/components/AynaDusunuyor";

const t = tr.ayna;

// AYNA'NIN TEK CÜMLESİ — kapanışın duygusal doruğu.
// Hazırsa doğrudan belirir; değilse sayfa açılınca SESSİZCE üretilir (buton yok)
// ve harf harf belirir: AYNA üç günün ardından son cümlesini yazıyor hissi.
export default function TekCumleBolumu({ mevcut }: { mevcut: string | null }) {
  const [cumle, setCumle] = useState<string | null>(mevcut);
  const [yukleniyor, setYukleniyor] = useState(!mevcut);
  const [hata, setHata] = useState(false);
  const istendi = useRef(false);

  useEffect(() => {
    if (cumle || istendi.current) return;
    istendi.current = true;
    (async () => {
      try {
        const res = await fetch("/api/ayna-cumle", { method: "POST" });
        if (!res.ok) {
          setHata(true);
          return;
        }
        const veri = await res.json();
        setCumle(veri.cumle ?? null);
      } catch {
        setHata(true);
      } finally {
        setYukleniyor(false);
      }
    })();
  }, [cumle]);

  return (
    <section className="kart-cerceve relative overflow-hidden rounded-3xl border-2 border-gold/40 bg-gradient-to-b from-gold/10 to-midnight-card/70 p-6 text-center shadow-xl">
      <span className="altin-tel" aria-hidden />
      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-gold-light/80">
        {t.tekCumleBaslik}
      </p>

      {cumle ? (
        <TypingReveal metin={cumle} />
      ) : yukleniyor ? (
        <div className="mt-5">
          <AynaDusunuyor satirlar={[t.tekCumleBekle]} />
        </div>
      ) : hata ? (
        <p className="mt-4 text-sm text-slate-400">{t.tekCumleHata}</p>
      ) : null}

      {cumle && (
        <p className="mt-5 text-[0.7rem] font-semibold uppercase tracking-wide text-slate-500">
          — Aynan
        </p>
      )}
    </section>
  );
}

// Harf harf beliren cümle — tek seferlik, sakin tempolu.
function TypingReveal({ metin }: { metin: string }) {
  const [n, setN] = useState(0);

  useEffect(() => {
    setN(0);
    const id = setInterval(() => {
      setN((k) => {
        if (k >= metin.length) {
          clearInterval(id);
          return k;
        }
        return k + 1;
      });
    }, 38);
    return () => clearInterval(id);
  }, [metin]);

  const bitti = n >= metin.length;
  return (
    <p className="prizma-serif ay-metin mx-auto mt-5 max-w-md text-xl font-semibold italic leading-relaxed">
      &ldquo;{metin.slice(0, n)}
      {!bitti && <span className="ml-0.5 inline-block animate-pulse text-gold-light">▍</span>}
      {bitti && "”"}
    </p>
  );
}
