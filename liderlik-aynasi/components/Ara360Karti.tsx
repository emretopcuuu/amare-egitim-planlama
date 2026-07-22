"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// [E#38] 45. GÜN ARA-360 — 3 soruluk hızlı öz-değerlendirme (1-5). Yolun ortasında
// "neredeyim?" anı. Kısa; her soru tek dokunuş.
export default function Ara360Karti({ korNokta }: { korNokta: string | null }) {
  const router = useRouter();
  const [gelisim, setGelisim] = useState<number | null>(null);
  const [netlik, setNetlik] = useState<number | null>(null);
  const [enerji, setEnerji] = useState<number | null>(null);
  const [durum, setDurum] = useState<"hazir" | "gonderiliyor" | "oldu" | "hata">("hazir");

  const hepsi = gelisim != null && netlik != null && enerji != null;

  async function gonder() {
    if (!hepsi || durum === "gonderiliyor") return;
    setDurum("gonderiliyor");
    try {
      const res = await fetch("/api/ara-360", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ korNokta, gelisim, netlik, enerji }),
      });
      if (res.ok) {
        setDurum("oldu");
        setTimeout(() => router.refresh(), 1400);
      } else setDurum("hata");
    } catch {
      setDurum("hata");
    }
  }

  if (durum === "oldu") {
    return (
      <section className="rounded-2xl border border-emerald-400/30 bg-emerald-500/[0.07] p-5 text-center">
        <p className="text-2xl" aria-hidden>🪞</p>
        <p className="mt-1 text-sm font-semibold text-emerald-300">Ara ölçümün alındı</p>
        <p className="mt-1 text-xs text-slate-400">Yolun ikinci yarısında da yanındayım.</p>
      </section>
    );
  }

  const Soru = ({
    baslik,
    deger,
    setDeger,
  }: {
    baslik: string;
    deger: number | null;
    setDeger: (n: number) => void;
  }) => (
    <div>
      <p className="text-sm text-slate-200">{baslik}</p>
      <div className="mt-1.5 flex gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onClick={() => setDeger(n)}
            className={`h-9 flex-1 rounded-lg text-sm font-bold transition-colors ${
              deger === n
                ? "bg-gold text-[#1a1206]"
                : "bg-white/[0.05] text-slate-400 hover:bg-white/10"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <section className="rounded-2xl border border-royal-light/30 bg-royal/[0.06] p-5">
      <div className="flex items-center gap-2">
        <span className="text-xl" aria-hidden>🪞</span>
        <h2 className="text-base font-bold text-royal-light">45. gün — kısa bir ara ölçüm</h2>
      </div>
      <p className="mt-1 text-xs text-slate-400">Yolun ortasındasın. Üç soru, 20 saniye. (1 = az, 5 = çok)</p>
      <div className="mt-3 space-y-3">
        <Soru
          baslik={
            korNokta
              ? `Kampta "${korNokta}" gelişim alanın çıkmıştı. 45 günde ne kadar ilerledin?`
              : "Kampta çıkan gelişim alanında 45 günde ne kadar ilerledin?"
          }
          deger={gelisim}
          setDeger={setGelisim}
        />
        <Soru baslik="Kendini bu yolculukta ne kadar net görüyorsun?" deger={netlik} setDeger={setNetlik} />
        <Soru baslik="Kalan 45 güne enerjin ne durumda?" deger={enerji} setDeger={setEnerji} />
      </div>
      {durum === "hata" && <p className="mt-2 text-center text-xs text-amber-300">Kaydedilemedi — tekrar dene.</p>}
      <button
        onClick={() => void gonder()}
        disabled={!hepsi || durum === "gonderiliyor"}
        className="btn-kor mt-4 flex h-11 w-full items-center justify-center rounded-xl text-sm font-bold disabled:opacity-50"
      >
        {durum === "gonderiliyor" ? "Kaydediliyor…" : "Ölçümümü ver"}
      </button>
    </section>
  );
}
