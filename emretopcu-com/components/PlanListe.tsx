"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { CheckCircle, WhatsappLogo } from "@phosphor-icons/react";
import { WHATSAPP_NUMARA } from "@/lib/icerik";
import { olcum } from "@/lib/olcum";

// İlk 72 Saat planı — canlı çek-liste. İşaretler localStorage'da kalır;
// 6/6 tamamlanınca Emre'ye giden kutlama CTA'sı açılır. Yazdırmada
// etkileşimli daireler gizlenir, klasik kare kutular basılır.
const PLAN_ANAHTAR = "emretopcu_plan";

const BITTI_MESAJ =
  "Merhaba, İlk 72 Saat planındaki 6 adımın hepsini tamamladım. Sıradaki adımı konuşabilir miyiz? [plan]";

export default function PlanListe({
  adimlar,
}: {
  adimlar: { baslik: string; metin: string }[];
}) {
  const [isaretli, setIsaretli] = useState<boolean[]>(() =>
    adimlar.map(() => false),
  );
  const [yuklendi, setYuklendi] = useState(false);

  useEffect(() => {
    try {
      const kayit = localStorage.getItem(PLAN_ANAHTAR);
      if (kayit) {
        const dizi = JSON.parse(kayit) as boolean[];
        if (Array.isArray(dizi)) {
          setIsaretli(adimlar.map((_, i) => !!dizi[i]));
        }
      }
    } catch {
      /* yoksay */
    }
    setYuklendi(true);
  }, [adimlar]);

  const degistir = (i: number) => {
    setIsaretli((eski) => {
      const yeni = [...eski];
      yeni[i] = !yeni[i];
      try {
        localStorage.setItem(PLAN_ANAHTAR, JSON.stringify(yeni));
      } catch {
        /* yoksay */
      }
      if (yeni.every(Boolean)) olcum("plan-tamam");
      return yeni;
    });
  };

  const tamam = isaretli.filter(Boolean).length;
  const hepsi = tamam === adimlar.length;

  return (
    <div>
      {/* İlerleme — yalnız ekranda */}
      <div className="mt-8 print:hidden">
        <div className="flex items-baseline justify-between text-sm">
          <span className="font-medium text-altin">
            {tamam} / {adimlar.length} adım
          </span>
          {tamam > 0 && !hepsi && (
            <span className="text-duman">Kaldığın yerden devam et.</span>
          )}
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-black/10">
          <motion.div
            className="h-full origin-left bg-altin"
            animate={{ scaleX: tamam / adimlar.length }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            style={{ transformOrigin: "left" }}
          />
        </div>
      </div>

      <ol className="mt-8 space-y-6">
        {adimlar.map((a, i) => {
          const secili = yuklendi && isaretli[i];
          return (
            <li
              key={a.baslik}
              className={`flex gap-4 rounded-2xl border p-5 transition-colors print:border-black/20 print:bg-white ${
                secili
                  ? "border-altin/50 bg-altin/5"
                  : "border-black/10 bg-abanoz-2"
              }`}
            >
              <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full border border-altin/50 font-lux text-sm text-altin">
                {i + 1}
              </span>
              <div className="min-w-0">
                <h2
                  className={`text-lg font-semibold ${
                    secili ? "text-fildisi/60 line-through" : "text-fildisi"
                  }`}
                >
                  {a.baslik}
                </h2>
                <p className="mt-1 leading-relaxed text-duman">{a.metin}</p>
              </div>
              {/* Ekranda: canlı işaret düğmesi */}
              <button
                type="button"
                onClick={() => degistir(i)}
                aria-pressed={secili}
                aria-label={`${a.baslik} — ${secili ? "işareti kaldır" : "tamamlandı işaretle"}`}
                className="mt-1 ml-auto shrink-0 self-start text-altin transition-transform active:scale-90 print:hidden"
              >
                {secili ? (
                  <CheckCircle size={28} weight="fill" />
                ) : (
                  <span className="block h-7 w-7 rounded-full border-2 border-altin/40 transition-colors hover:border-altin" />
                )}
              </button>
              {/* Baskıda: klasik kare kutu */}
              <span
                aria-hidden
                className="mt-1 ml-auto hidden h-6 w-6 shrink-0 rounded border border-black/30 print:block"
              />
            </li>
          );
        })}
      </ol>

      {/* 6/6: kutlama + Emre'ye yaz */}
      {hepsi && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-altin/40 bg-altin/10 p-6 print:hidden"
        >
          <p className="font-lux text-lg text-fildisi">
            72 saat bitti — ilk adımı attın.
          </p>
          <a
            href={`https://wa.me/${WHATSAPP_NUMARA}?text=${encodeURIComponent(BITTI_MESAJ)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-altin px-6 py-3 font-medium text-fildisi active:scale-[0.98]"
          >
            <WhatsappLogo size={18} weight="fill" />
            Emre&apos;ye yaz
          </a>
        </motion.div>
      )}
    </div>
  );
}
