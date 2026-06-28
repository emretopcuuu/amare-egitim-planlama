"use client";

import { useEffect, useRef, useState } from "react";
import { tr } from "@/lib/i18n/tr";
import AynaDusunuyor from "@/components/AynaDusunuyor";

const t = tr.ayna;

// "SENİN İÇİN" KÖPRÜSÜ — kişinin nedenini (uğruna savaştığı insanı) canlı tutar.
// Sayfa açılınca sessizce üretilir; elit bir kartta belirir. "Sevdiğine gönder"
// ile metni doğrudan paylaşır (WhatsApp vb.) — neden ete kemiğe bürünür.
export default function SeninIcinBolumu({ mevcut }: { mevcut: string | null }) {
  const [metin, setMetin] = useState<string | null>(mevcut);
  const [yukleniyor, setYukleniyor] = useState(!mevcut);
  const [hata, setHata] = useState(false);
  const [kopyalandi, setKopyalandi] = useState(false);
  const [paylasilabilir, setPaylasilabilir] = useState(false);
  const istendi = useRef(false);

  useEffect(() => {
    setPaylasilabilir(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  useEffect(() => {
    if (metin || istendi.current) return;
    istendi.current = true;
    (async () => {
      try {
        const res = await fetch("/api/senin-icin", { method: "POST" });
        if (!res.ok) {
          setHata(true);
          return;
        }
        const veri = await res.json();
        setMetin(veri.metin ?? null);
      } catch {
        setHata(true);
      } finally {
        setYukleniyor(false);
      }
    })();
  }, [metin]);

  // Üretim başarısızsa (ör. çekirdek neden yok) bölümü hiç gösterme — boş kart kalmasın.
  if (hata && !metin) return null;

  async function paylas() {
    if (!metin) return;
    try {
      await navigator.share({ text: metin });
    } catch {
      // kullanıcı iptal etti ya da paylaşım yok — sorun değil
    }
  }

  async function kopyala() {
    if (!metin) return;
    try {
      await navigator.clipboard.writeText(metin);
      setKopyalandi(true);
      setTimeout(() => setKopyalandi(false), 2000);
    } catch {
      // sessiz
    }
  }

  return (
    <section className="kart-cerceve relative overflow-hidden rounded-3xl border-2 border-rose-300/30 bg-gradient-to-b from-rose-400/[0.08] to-midnight-card/70 p-6 shadow-xl">
      <span className="altin-tel" aria-hidden />
      <div className="flex items-center gap-2">
        <span className="text-lg" aria-hidden>💗</span>
        <h2 className="prizma-serif ay-metin text-lg font-semibold">{t.seninIcinBaslik}</h2>
      </div>
      <p className="mt-0.5 text-xs text-slate-400">{t.seninIcinAciklama}</p>

      {metin ? (
        <>
          <p className="prizma-serif mt-4 whitespace-pre-wrap text-base font-medium leading-relaxed text-slate-100">
            {metin}
          </p>
          <p className="mt-3 text-[0.7rem] font-semibold uppercase tracking-wide text-rose-200/70">
            — Aynan
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {paylasilabilir && (
              <button
                onClick={paylas}
                className="flex-1 rounded-xl bg-rose-400/15 px-4 py-2.5 text-sm font-semibold text-rose-200 ring-1 ring-rose-300/30 transition-colors hover:bg-rose-400/25"
              >
                💌 {t.seninIcinPaylas}
              </button>
            )}
            <button
              onClick={kopyala}
              className="flex-1 rounded-xl bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-slate-300 ring-1 ring-white/10 transition-colors hover:bg-white/[0.08]"
            >
              {kopyalandi ? t.seninIcinKopyalandi : `📋 ${t.seninIcinKopyala}`}
            </button>
          </div>
        </>
      ) : yukleniyor ? (
        <div className="mt-5">
          <AynaDusunuyor satirlar={[t.seninIcinBekle]} />
        </div>
      ) : null}
    </section>
  );
}
