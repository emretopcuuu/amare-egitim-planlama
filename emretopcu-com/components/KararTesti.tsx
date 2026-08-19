"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircle, DownloadSimple, WhatsappLogo, ArrowCounterClockwise } from "@phosphor-icons/react";
import { WHATSAPP_NUMARA } from "@/lib/icerik";
import { olcum } from "@/lib/olcum";

// Cevaba göre öndolu WhatsApp mesajı — Emre görüşmeyi hazır profille açar.
const NEDEN: Record<string, string> = {
  gelir: "ek gelir arıyorum",
  ozgurluk: "finansal özgürlük istiyorum",
  liderlik: "kendi işimi kurmak ve liderlik istiyorum",
};
const ZAMAN: Record<string, string> = {
  az: "günde ~1 saatim var",
  orta: "günde 2-3 saatim var",
  tam: "tam zamanlı bakabilirim",
};
const ZORLUK: Record<string, string> = {
  cevre: "çevrem olmaması",
  zaman: "zaman",
  bilgi: "nasıl yapılacağını bilmemek",
};
function profilliWhatsapp(cevaplar: string[]): string {
  const [neden, zaman, zorluk] = cevaplar;
  const m = `Merhaba, doğrudan satışı düşünüyorum. ${NEDEN[neden] ?? ""}, ${ZAMAN[zaman] ?? ""}; en çok ${ZORLUK[zorluk] ?? ""} beni düşündürüyor. Ön görüşme alabilir miyim? [karar-testi]`;
  return `https://wa.me/${WHATSAPP_NUMARA}?text=${encodeURIComponent(m)}`;
}

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

// Cevap anahtarını görünen etikete çevirir (kart ve özet için).
function etiketBul(soruIdx: number, anahtar: string): string {
  return (
    SORULAR[soruIdx].secenekler.find((s) => s.anahtar === anahtar)?.etiket ?? ""
  );
}

/* Sonuç ekranından indirilebilen paylaşılabilir profil kartı (PNG). */
function kartIndir(cevaplar: string[]) {
  const c = document.createElement("canvas");
  c.width = 1080;
  c.height = 1350;
  const x = c.getContext("2d");
  if (!x) return;
  x.fillStyle = "#101322";
  x.fillRect(0, 0, 1080, 1350);
  x.strokeStyle = "rgba(216,180,90,0.55)";
  x.lineWidth = 3;
  x.strokeRect(48, 48, 984, 1254);
  x.textAlign = "center";
  x.fillStyle = "#d8b45a";
  x.font = "600 34px Georgia, serif";
  x.fillText("EMRE TOPÇU · KARAR TESTİ", 540, 170);
  x.fillStyle = "#f1eee6";
  x.font = "600 60px Georgia, serif";
  x.fillText("Benim başlangıç profilim", 540, 320);
  const basliklar = ["NEDENİM", "ZAMANIM", "BENİ DÜŞÜNDÜREN"];
  cevaplar.forEach((a, i) => {
    x.fillStyle = "#d8b45a";
    x.font = "30px Georgia, serif";
    x.fillText(basliklar[i] ?? "", 540, 480 + i * 210);
    x.fillStyle = "#f1eee6";
    x.font = "600 48px Georgia, serif";
    x.fillText(etiketBul(i, a), 540, 545 + i * 210);
  });
  x.fillStyle = "#a19e96";
  x.font = "30px Georgia, serif";
  x.fillText("emretopcu.ai/dusunuyorum", 540, 1240);
  const bag = document.createElement("a");
  bag.download = "karar-testi.png";
  bag.href = c.toDataURL("image/png");
  bag.click();
}

export default function KararTesti() {
  const [adim, setAdim] = useState(0);
  const [cevaplar, setCevaplar] = useState<string[]>([]);
  // Seçim mikro-onayı: dokunulan seçenek 260 ms altınla vurgulanır, sonra geçilir.
  const [secilen, setSecilen] = useState<string | null>(null);

  const sec = (anahtar: string) => {
    if (secilen) return;
    setSecilen(anahtar);
    window.setTimeout(() => {
      const yeni = [...cevaplar];
      yeni[adim] = anahtar;
      setCevaplar(yeni);
      setAdim(adim + 1);
      setSecilen(null);
      if (adim + 1 >= SORULAR.length) {
        olcum("test-bitti");
        try {
          localStorage.setItem("emretopcu_test", "1");
          localStorage.setItem(
            "emretopcu_test_profil",
            JSON.stringify({ neden: yeni[0], zaman: yeni[1], zorluk: yeni[2] }),
          );
        } catch {
          /* yoksay */
        }
      }
    }, 260);
  };

  const sifirla = () => {
    setCevaplar([]);
    setAdim(0);
  };

  const bitti = adim >= SORULAR.length;

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <div className="mb-10 flex items-center justify-between">
        <a
          href="/"
          className="text-sm text-duman transition-colors hover:text-altin"
        >
          ← Ana sayfa
        </a>
        <span className="text-sm text-duman tabular-nums">
          {Math.min(adim + 1, SORULAR.length)} / {SORULAR.length}
        </span>
      </div>

      {/* İlerleme çubuğu */}
      <div className="mb-12 h-1.5 w-full overflow-hidden rounded-full bg-fildisi/10">
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
            <p aria-hidden className="font-lux text-7xl leading-none text-altin/20">
              0{adim + 1}
            </p>
            <h1 className="mt-4 font-lux text-3xl font-semibold tracking-tight md:text-5xl">
              {SORULAR[adim].soru}
            </h1>
            <div className="mt-10 space-y-3">
              {SORULAR[adim].secenekler.map((s) => {
                const vurgulu = secilen === s.anahtar;
                return (
                  <button
                    key={s.anahtar}
                    type="button"
                    onClick={() => sec(s.anahtar)}
                    className={`flex w-full items-center justify-between rounded-2xl border px-6 py-5 text-left text-lg transition-all active:scale-[0.99] ${
                      vurgulu
                        ? "scale-[1.01] border-altin bg-altin/15 text-altin"
                        : "border-fildisi/10 bg-abanoz-2 text-fildisi hover:border-altin/50 hover:text-altin"
                    }`}
                  >
                    {s.etiket}
                    {vurgulu && (
                      <motion.span
                        initial={{ scale: 0.4, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 400, damping: 18 }}
                      >
                        <CheckCircle size={24} weight="fill" className="text-altin" />
                      </motion.span>
                    )}
                  </button>
                );
              })}
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
            {/* Paylaşılabilir profil kartı */}
            <div className="mt-10 rounded-3xl border border-altin/30 bg-abanoz-2/70 p-7">
              <p className="text-xs font-medium tracking-[0.2em] text-altin uppercase">
                Başlangıç profilin
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                {["Nedenim", "Zamanım", "Beni düşündüren"].map((b, i) => (
                  <div key={b}>
                    <p className="text-xs text-duman uppercase">{b}</p>
                    <p className="mt-1 font-lux text-lg text-fildisi">
                      {etiketBul(i, cevaplar[i])}
                    </p>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => { kartIndir(cevaplar); olcum("test-kart"); }}
                className="mt-6 inline-flex items-center gap-2 rounded-full border border-altin/40 px-5 py-2.5 text-sm font-medium text-altin transition-colors hover:bg-altin hover:text-fildisi"
              >
                <DownloadSimple size={16} weight="bold" />
                Kartı indir
              </button>
            </div>
            {/* Bir adım öteye: ters mülakat — cevaplar dosyaya işlenir */}
            <a
              href="/basvuru"
              className="mt-6 inline-block text-sm font-medium text-altin underline-offset-2 hover:underline"
            >
              Bir adım öteye git: görüşmeye başvur — test cevapların dosyana eklenir →
            </a>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <a
                href={profilliWhatsapp(cevaplar)}
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
