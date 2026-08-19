"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { CircleNotch, SealCheck } from "@phosphor-icons/react";
import { olcum } from "@/lib/olcum";

// Görüşme dosyası görüntüleyici: Emre WhatsApp'taki bağlantıya dokunur,
// adayın 5 cevabını + (varsa) karar testi profilini + yapay zekâ ön
// okumasını tek bakışta görür. Aday da kendi kodusuyla kendi dosyasını
// görebilir — kod, dosyanın taşıyıcı anahtarıdır.
type Dosya = {
  kod: string;
  tarih: string;
  cevaplar: { soru: string; cevap: string }[];
  testProfil: Record<string, string> | null;
  onOkuma: string | null;
};

const TEST_ETIKET: Record<string, string> = {
  gelir: "Ek gelir",
  ozgurluk: "Finansal özgürlük",
  liderlik: "Kendi işim, liderlik",
  az: "Günde ~1 saat",
  orta: "Günde 2-3 saat",
  tam: "Tam zamanlı",
  cevre: "Çevrem yok",
  zaman: "Zamanım yok",
  bilgi: "Nasıl yapılacağını bilmiyorum",
};

export default function DosyaGoruntule() {
  const [kodGirdi, setKodGirdi] = useState("");
  const [dosya, setDosya] = useState<Dosya | null>(null);
  const [durum, setDurum] = useState<"bos" | "yukleniyor" | "yok" | "tamam">(
    "bos",
  );

  const getir = async (kod: string) => {
    setDurum("yukleniyor");
    try {
      const r = await fetch(`/api/dosya?kod=${encodeURIComponent(kod)}`);
      if (!r.ok) {
        setDurum("yok");
        return;
      }
      const d = (await r.json()) as Dosya;
      setDosya(d);
      setDurum("tamam");
      olcum("dosya-goruntule");
    } catch {
      setDurum("yok");
    }
  };

  useEffect(() => {
    const kod = new URLSearchParams(window.location.search).get("kod");
    if (kod) {
      setKodGirdi(kod.toUpperCase());
      getir(kod.toUpperCase());
    }
  }, []);

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <div className="mb-10">
        <a
          href="/"
          className="text-sm text-duman transition-colors hover:text-altin"
        >
          ← Ana sayfa
        </a>
      </div>

      <p className="text-sm font-medium tracking-[0.2em] text-altin uppercase">
        Görüşme dosyası
      </p>

      {durum !== "tamam" && (
        <div className="mt-6">
          <h1 className="font-lux text-3xl font-semibold tracking-tight md:text-5xl">
            Dosyayı aç.
          </h1>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (kodGirdi.trim()) getir(kodGirdi.trim().toUpperCase());
            }}
            className="mt-8 flex gap-3"
          >
            <input
              value={kodGirdi}
              onChange={(e) => setKodGirdi(e.target.value.toUpperCase())}
              placeholder="ET-XXXXXX"
              maxLength={9}
              className="w-full rounded-full border border-fildisi/15 bg-abanoz-2 px-5 py-3.5 font-lux text-lg tracking-widest text-fildisi outline-none placeholder:text-duman/50 focus:border-altin/60"
            />
            <button
              type="submit"
              disabled={durum === "yukleniyor"}
              className="shrink-0 rounded-full bg-altin px-6 py-3.5 font-medium text-fildisi active:scale-[0.98] disabled:opacity-50"
            >
              {durum === "yukleniyor" ? (
                <CircleNotch size={20} className="animate-spin" />
              ) : (
                "Aç"
              )}
            </button>
          </form>
          {durum === "yok" && (
            <p className="mt-4 text-sm text-duman">
              Bu kodla bir dosya bulunamadı. Kod 90 gün sonra kendiliğinden
              silinir; yeni başvuru gerekebilir.
            </p>
          )}
        </div>
      )}

      {durum === "tamam" && dosya && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="mt-4 flex items-center justify-between gap-4">
            <h1 className="font-lux text-3xl font-semibold tracking-tight md:text-4xl">
              {dosya.kod}
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-altin/40 px-3 py-1 text-xs font-medium text-altin">
              <SealCheck size={14} weight="fill" />
              {new Date(dosya.tarih).toLocaleDateString("tr-TR", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
          </div>

          {dosya.onOkuma && (
            <div className="mt-8 rounded-2xl border border-altin/30 bg-altin/5 p-6">
              <p className="text-xs font-medium tracking-[0.2em] text-altin uppercase">
                Yapay zekâ ön okuması — yalnız hazırlık notu
              </p>
              <p className="mt-3 leading-relaxed text-fildisi/90">
                {dosya.onOkuma}
              </p>
            </div>
          )}

          {dosya.testProfil && (
            <div className="mt-6 rounded-2xl border border-fildisi/10 bg-abanoz-2 p-6">
              <p className="text-xs font-medium tracking-[0.2em] text-duman uppercase">
                Karar testi profili
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {Object.values(dosya.testProfil).map((v, i) => (
                  <span
                    key={i}
                    className="rounded-full border border-altin/30 px-3 py-1 text-sm text-fildisi/90"
                  >
                    {TEST_ETIKET[v] ?? v}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 space-y-7">
            {dosya.cevaplar.map((c, i) => (
              <div key={i}>
                <p className="flex gap-3 text-sm font-medium text-altin">
                  <span className="font-lux">0{i + 1}</span>
                  {c.soru}
                </p>
                <p className="mt-2 border-l-2 border-altin/25 pl-4 text-lg leading-relaxed text-fildisi/90">
                  {c.cevap}
                </p>
              </div>
            ))}
          </div>

          <p className="mt-10 text-xs leading-relaxed text-duman/80">
            Bu dosya görüşme hazırlığı içindir; 90 gün sonra kendiliğinden
            silinir.
          </p>
        </motion.div>
      )}
    </div>
  );
}
