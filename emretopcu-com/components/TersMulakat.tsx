"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowRight,
  CircleNotch,
  SealCheck,
  WhatsappLogo,
} from "@phosphor-icons/react";
import { WHATSAPP_NUMARA } from "@/lib/icerik";
import { olcum } from "@/lib/olcum";

// Ters Mülakat: "benimle çalış" değil, "görüşmeye başvur". Aday 5 soruya
// KENDİ cümleleriyle cevap verir; cevaplar görüşme dosyasına dönüşür ve
// Emre karşısına adayı tanıyarak çıkar. Son soru statüyü tersine çevirir.
const GECIS = [0.16, 1, 0.3, 1] as const;

const SORULAR = [
  {
    soru: "Şu an hayatında neyi değiştirmek istiyorsun — ve neden şimdi?",
    not: "Nedeni güçlü olanın, nasılı kolay bulunur.",
    ornek: "Kendi cümlelerinle; iki cümle yeter.",
  },
  {
    soru: "Bugüne kadar seni en çok ne durdurdu?",
    not: "Engel çoğu zaman dışarıda değildir; adını koyalım.",
    ornek: "Zaman, çevre, özgüven, sermaye… ne ise, açıkça.",
  },
  {
    soru: "Doğrudan satış deyince aklına ilk ne geliyor?",
    not: "Önyargın varsa çekinme, yaz. Açık konuşana açık konuşurum.",
    ornek: "İyi ya da kötü — ilk izlenimin.",
  },
  {
    soru: "Haftada kaç saat ayırabilirsin — ve 12 ay sonra nerede olursan 'değdi' dersin?",
    not: "Minimum neye ulaşırsan gerçekten heyecanlanırsın? Öncelik netleşmeden zaman bulunmaz.",
    ornek: "Örn: haftada 10 saat; 12 ay sonra …",
  },
  {
    soru: "Ve son soru: Neden seninle çalışayım?",
    not: "Evet, doğru okudun. Bu masada iki taraf da seçer.",
    ornek: "Kendini anlat — burada alçakgönüllülük puan getirmez.",
  },
];

type Asama = "giris" | "sorular" | "gonderiliyor" | "muhur" | "hata";

export default function TersMulakat() {
  const [asama, setAsama] = useState<Asama>("giris");
  const [adim, setAdim] = useState(0);
  const [cevaplar, setCevaplar] = useState<string[]>(SORULAR.map(() => ""));
  const [kod, setKod] = useState<string | null>(null);
  const [testProfil, setTestProfil] = useState<Record<string, string> | null>(
    null,
  );

  // Karar testini bitirmiş adayın profili dosyaya otomatik eklenir.
  useEffect(() => {
    try {
      const p = localStorage.getItem("emretopcu_test_profil");
      if (p) setTestProfil(JSON.parse(p) as Record<string, string>);
    } catch {
      /* yoksay */
    }
  }, []);

  const guncelle = (v: string) => {
    setCevaplar((eski) => {
      const yeni = [...eski];
      yeni[adim] = v;
      return yeni;
    });
  };

  const ileri = () => {
    if (cevaplar[adim].trim().length < 2) return;
    if (adim + 1 < SORULAR.length) {
      setAdim(adim + 1);
    } else {
      gonder();
    }
  };

  const gonder = async () => {
    setAsama("gonderiliyor");
    try {
      const r = await fetch("/api/basvuru", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          cevaplar: SORULAR.map((s, i) => ({
            soru: s.soru,
            cevap: cevaplar[i].trim(),
          })),
          testProfil,
        }),
      });
      const d = (await r.json()) as { ok?: boolean; kod?: string };
      if (r.ok && d.ok && d.kod) {
        setKod(d.kod);
        setAsama("muhur");
        olcum("basvuru-bitti");
        return;
      }
      setAsama("hata");
    } catch {
      setAsama("hata");
    }
  };

  const dosyaLink = kod ? `emretopcu.ai/dosya?kod=${kod}` : "";
  const waMesaj = kod
    ? `Merhaba, görüşme başvurumu tamamladım. Dosya kodum: ${kod} — ${dosyaLink} [basvuru]`
    : "Merhaba, görüşme başvurusu yapmak istedim ama dosya oluşturulamadı. [basvuru]";
  const waUrl = `https://wa.me/${WHATSAPP_NUMARA}?text=${encodeURIComponent(waMesaj)}`;

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <div className="mb-10 flex items-center justify-between">
        <a
          href="/"
          className="text-sm text-duman transition-colors hover:text-altin"
        >
          ← Ana sayfa
        </a>
        {asama === "sorular" && (
          <span className="text-sm text-duman tabular-nums">
            {adim + 1} / {SORULAR.length}
          </span>
        )}
      </div>

      <AnimatePresence mode="wait">
        {asama === "giris" && (
          <motion.div
            key="giris"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5, ease: GECIS }}
          >
            <p className="text-sm font-medium tracking-[0.2em] text-altin uppercase">
              Ters mülakat
            </p>
            <h1 className="mt-4 font-lux text-4xl font-semibold tracking-tight md:text-6xl">
              Görüşmeye başvur.
            </h1>
            <p className="mt-6 max-w-[56ch] text-lg leading-relaxed text-duman">
              Burada düğmeye basan herkesle görüşülmez; hazırlanan herkesle
              görüşülür. Beş soru, üç-dört dakika. Cevapların bir görüşme
              dosyasına dönüşür — Emre karşına seni tanıyarak çıkar.
            </p>
            {testProfil && (
              <p className="mt-4 text-sm text-altin">
                Karar testi cevapların dosyana otomatik eklenecek.
              </p>
            )}
            <button
              type="button"
              onClick={() => {
                setAsama("sorular");
                olcum("basvuru-basla");
              }}
              className="mt-10 inline-flex items-center gap-2 rounded-full bg-altin px-8 py-4 text-lg font-medium text-fildisi transition-transform active:scale-[0.98]"
            >
              Başvuruya başla
              <ArrowRight size={20} weight="bold" />
            </button>
            <p className="mt-6 max-w-[52ch] text-xs leading-relaxed text-duman/80">
              Cevapların yalnız görüşme hazırlığı için saklanır (90 gün sonra
              kendiliğinden silinir) ve üçüncü kişilerle paylaşılmaz.
            </p>
          </motion.div>
        )}

        {asama === "sorular" && (
          <motion.div
            key={`soru-${adim}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: GECIS }}
          >
            <p aria-hidden className="font-lux text-7xl leading-none text-altin/20">
              0{adim + 1}
            </p>
            <h2 className="mt-4 font-lux text-2xl font-semibold tracking-tight md:text-4xl">
              {SORULAR[adim].soru}
            </h2>
            <p className="mt-3 text-sm text-altin/90">— {SORULAR[adim].not}</p>
            <textarea
              value={cevaplar[adim]}
              onChange={(e) => guncelle(e.target.value)}
              placeholder={SORULAR[adim].ornek}
              rows={5}
              maxLength={1200}
              autoFocus
              className="mt-8 w-full resize-none rounded-2xl border border-fildisi/15 bg-abanoz-2 p-5 text-lg leading-relaxed text-fildisi outline-none placeholder:text-duman/60 focus:border-altin/60"
            />
            <div className="mt-6 flex items-center justify-between">
              {adim > 0 ? (
                <button
                  type="button"
                  onClick={() => setAdim(adim - 1)}
                  className="text-sm text-duman transition-colors hover:text-altin"
                >
                  ← Önceki
                </button>
              ) : (
                <span />
              )}
              <button
                type="button"
                onClick={ileri}
                disabled={cevaplar[adim].trim().length < 2}
                className="inline-flex items-center gap-2 rounded-full bg-altin px-7 py-3.5 font-medium text-fildisi transition-transform active:scale-[0.98] disabled:opacity-40"
              >
                {adim + 1 < SORULAR.length ? "Sonraki soru" : "Dosyamı oluştur"}
                <ArrowRight size={18} weight="bold" />
              </button>
            </div>
          </motion.div>
        )}

        {asama === "gonderiliyor" && (
          <motion.div
            key="bekle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center py-24 text-center"
          >
            <CircleNotch size={36} className="animate-spin text-altin" />
            <p className="mt-6 text-duman">Görüşme dosyan mühürleniyor…</p>
          </motion.div>
        )}

        {asama === "muhur" && kod && (
          <motion.div
            key="muhur"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: GECIS }}
            className="text-center"
          >
            {/* Mühür */}
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 16, delay: 0.15 }}
              className="mx-auto flex h-52 w-52 flex-col items-center justify-center rounded-full border-2 border-altin/70 bg-altin/5"
            >
              <SealCheck size={30} weight="fill" className="text-altin" />
              <p className="mt-2 text-[0.6rem] font-medium tracking-[0.25em] text-duman uppercase">
                Görüşme dosyası
              </p>
              <p className="mt-1 font-lux text-3xl font-semibold tracking-wide text-altin">
                {kod}
              </p>
            </motion.div>
            <h2 className="mt-8 font-lux text-3xl font-semibold tracking-tight md:text-4xl">
              Dosyan hazır.
            </h2>
            <p className="mx-auto mt-4 max-w-[48ch] text-lg leading-relaxed text-duman">
              Kodun aşağıdaki mesaja eklendi. Emre, görüşmeden önce dosyanı
              açacak — karşına seni tanıyarak çıkacak.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => olcum("basvuru-whatsapp")}
                className="inline-flex items-center gap-2 rounded-full bg-altin px-8 py-4 text-lg font-medium text-fildisi transition-transform active:scale-[0.98]"
              >
                <WhatsappLogo size={20} weight="fill" />
                Kodunla yaz
              </a>
              <a
                href={`/dosya?kod=${kod}`}
                className="inline-flex items-center gap-2 rounded-full border border-altin/40 px-7 py-4 font-medium text-altin transition-colors hover:bg-altin hover:text-fildisi"
              >
                Dosyanı gör
              </a>
            </div>
          </motion.div>
        )}

        {asama === "hata" && (
          <motion.div
            key="hata"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <h2 className="font-lux text-3xl font-semibold tracking-tight">
              Dosya şu an oluşturulamadı.
            </h2>
            <p className="mx-auto mt-4 max-w-[46ch] text-duman">
              Cevapların kaybolmadı. İstersen tekrar dene; ya da doğrudan yaz —
              görüşmede baştan konuşuruz.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <button
                type="button"
                onClick={gonder}
                className="rounded-full bg-altin px-7 py-3.5 font-medium text-fildisi active:scale-[0.98]"
              >
                Tekrar dene
              </button>
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-altin/40 px-6 py-3.5 font-medium text-altin transition-colors hover:bg-altin hover:text-fildisi"
              >
                <WhatsappLogo size={18} weight="fill" />
                WhatsApp&apos;tan yaz
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
