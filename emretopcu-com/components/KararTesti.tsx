"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { WhatsappLogo, ArrowCounterClockwise } from "@phosphor-icons/react";
import { whatsappUrl } from "@/lib/icerik";

const GECIS = [0.16, 1, 0.3, 1] as const;

const SORULAR = [
  {
    soru: "Bu işe neden bakıyorsun?",
    secenekler: [
      { etiket: "Ek gelir", anahtar: "gelir" },
      { etiket: "Finansal özgürlük", anahtar: "ozgurluk" },
      { etiket: "Kendi işim, liderlik", anahtar: "liderlik" },
    ],
  },
  {
    soru: "Bu iş için ayırabileceğin zaman?",
    secenekler: [
      { etiket: "Günde ~1 saat", anahtar: "az" },
      { etiket: "Günde 2-3 saat", anahtar: "orta" },
      { etiket: "Tam zamanlı", anahtar: "tam" },
    ],
  },
  {
    soru: "En çok hangisi seni zorluyor?",
    secenekler: [
      { etiket: "Çevrem yok", anahtar: "cevre" },
      { etiket: "Zamanım yok", anahtar: "zaman" },
      { etiket: "Nasıl yapılacağını bilmiyorum", anahtar: "bilgi" },
    ],
  },
] as const;

const NOTLAR: Record<string, string> = {
  gelir:
    "Ek gelir arıyorsan şunu bil: doğru sistemde eforun azaldıkça gelirin artması gerekir. Tersini kuran çok kişi var.",
  ozgurluk:
    "Finansal özgürlük tek seferlik bir sıçrama değil; kopyalanabilen bir sistemle, katlanarak gelir.",
  liderlik:
    "Kendi işini ve liderliğini istiyorsan doğru yerdesin — bu iş, üye eklemekle değil lider üretmekle katlanır.",
  az: "Günde 1 saatle bile başlayabilirsin; önemli olan sürenin uzunluğu değil, tutarlılık.",
  orta: "Günde 2-3 saat, ilk momentumu kurmak için fazlasıyla yeterli.",
  tam: "Tam zamanlı bakıyorsan, ilk 72 saat planıyla hızlı bir başlangıç mümkün.",
  cevre:
    "Bu iş çevre işi değil. Ben ilk ay sadece 5 kişiyle el sıkıştım; bir yıl içinde ağ katlanarak büyüdü.",
  zaman:
    "Sorun genelde zaman değil, önceliğin netleşmemiş olması. Önce 'ne kazanırsam gerçekten heyecanlanırdım?' diye sor.",
  bilgi:
    "Nasıl yapılacağını bilmemek en kolay çözülen kısım — sistem ve eğitim arşivi tam da bunun için var. Yalnız değilsin.",
};

export default function KararTesti() {
  const [adim, setAdim] = useState(0);
  const [cevaplar, setCevaplar] = useState<string[]>([]);

  const sec = (anahtar: string) => {
    const yeni = [...cevaplar];
    yeni[adim] = anahtar;
    setCevaplar(yeni);
    setAdim(adim + 1);
  };

  const sifirla = () => {
    setCevaplar([]);
    setAdim(0);
  };

  const bitti = adim >= SORULAR.length;

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <div className="mb-10 flex items-center justify-between">
        <Link
          href="/"
          className="text-sm text-duman transition-colors hover:text-altin"
        >
          ← Ana sayfa
        </Link>
        <span className="text-sm text-duman tabular-nums">
          {Math.min(adim + 1, SORULAR.length)} / {SORULAR.length}
        </span>
      </div>

      {/* İlerleme çubuğu */}
      <div className="mb-12 h-[3px] w-full overflow-hidden rounded-full bg-black/10">
        <motion.div
          className="h-full origin-left bg-altin"
          animate={{ scaleX: (bitti ? SORULAR.length : adim) / SORULAR.length }}
          transition={{ duration: 0.5, ease: GECIS }}
          style={{ transformOrigin: "left" }}
        />
      </div>

      <AnimatePresence mode="wait">
        {!bitti ? (
          <motion.div
            key={adim}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: GECIS }}
          >
            <h1 className="font-lux text-3xl font-semibold tracking-tight md:text-5xl">
              {SORULAR[adim].soru}
            </h1>
            <div className="mt-10 space-y-3">
              {SORULAR[adim].secenekler.map((s) => (
                <button
                  key={s.anahtar}
                  type="button"
                  onClick={() => sec(s.anahtar)}
                  className="block w-full rounded-2xl border border-black/10 bg-abanoz-2 px-6 py-5 text-left text-lg text-fildisi transition-colors hover:border-altin/50 hover:text-altin active:scale-[0.99]"
                >
                  {s.etiket}
                </button>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="sonuc"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: GECIS }}
          >
            <p className="text-sm font-medium tracking-[0.2em] text-altin uppercase">
              Senin için birkaç not
            </p>
            <h1 className="mt-4 font-lux text-3xl font-semibold tracking-tight md:text-5xl">
              Cevapların bana şunu söylüyor
            </h1>
            <div className="mt-8 space-y-5">
              {cevaplar.map((a, i) => (
                <div key={i} className="flex gap-4">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-altin" />
                  <p className="text-lg leading-relaxed text-fildisi/90">
                    {NOTLAR[a]}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-12 flex flex-wrap items-center gap-4">
              <a
                href={whatsappUrl("karar-testi")}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-altin px-7 py-4 font-medium text-fildisi active:scale-[0.98]"
              >
                <WhatsappLogo size={18} weight="fill" />
                Ön görüşme için yaz
              </a>
              <button
                type="button"
                onClick={sifirla}
                className="inline-flex items-center gap-2 text-sm text-duman transition-colors hover:text-altin"
              >
                <ArrowCounterClockwise size={16} weight="bold" />
                Baştan al
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
