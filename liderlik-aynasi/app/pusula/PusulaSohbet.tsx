"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { tr } from "@/lib/i18n/tr";

const t = tr.pusula;

type Mesaj = { rol: string; icerik: string };

// Nedenler çalışmasının sohbet arayüzü. Geçmiş boşsa önce rıza ekranı; rıza
// sonrası AYNA açılışı (basla). Akış bitince (bitti) "pusulan kuruldu" ekranı.
export default function PusulaSohbet({ baslangic }: { baslangic: Mesaj[] }) {
  const router = useRouter();
  const [mesajlar, setMesajlar] = useState<Mesaj[]>(baslangic);
  const [girdi, setGirdi] = useState("");
  const [mesgul, setMesgul] = useState(false);
  const [bitti, setBitti] = useState(false);
  const [basladi, setBasladi] = useState(baslangic.length > 0);
  const [hata, setHata] = useState<string | null>(null);
  const altRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    altRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mesajlar, mesgul]);

  async function turYap(govde: { mesaj?: string; basla?: boolean }) {
    setMesgul(true);
    setHata(null);
    try {
      const res = await fetch("/api/pusula", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(govde),
      });
      const veri = await res.json().catch(() => null);
      if (!res.ok || !veri?.mesaj) {
        setHata(veri?.hata ?? t.aiHata);
        return;
      }
      setMesajlar((m) => [...m, { rol: "ayna", icerik: veri.mesaj }]);
      if (veri.bitti) {
        setBitti(true);
        // Bekleme ekranını sunucudan getirmek için kısa süre sonra tazele.
        setTimeout(() => router.refresh(), 2500);
      }
    } catch {
      setHata(t.aiHata);
    } finally {
      setMesgul(false);
    }
  }

  function basla() {
    setBasladi(true);
    void turYap({ basla: true });
  }

  function gonder() {
    const metin = girdi.trim();
    if (!metin || mesgul) return;
    setMesajlar((m) => [...m, { rol: "kullanici", icerik: metin }]);
    setGirdi("");
    void turYap({ mesaj: metin });
  }

  // ---- Rıza ekranı (henüz başlamadıysa) ----
  if (!basladi) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center px-6">
        <div className="kart-cam max-w-md rounded-3xl p-8 text-center">
          <p className="text-5xl" aria-hidden>
            🧭
          </p>
          <h1 className="prizma-serif ay-metin mt-4 text-2xl font-semibold">
            {t.rizaBaslik}
          </h1>
          <p className="mt-3 text-base leading-relaxed text-slate-300">{t.rizaMetin}</p>
          <p className="mt-3 text-xs text-slate-500">{t.rizaNot}</p>
          <button
            onClick={basla}
            className="btn-kor parilti mt-7 flex h-14 w-full items-center justify-center rounded-2xl text-lg font-bold"
          >
            {t.rizaKabul}
          </button>
        </div>
      </main>
    );
  }

  // ---- Tamamlandı ekranı ----
  if (bitti) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
        <div className="kart-cam max-w-md rounded-3xl p-10">
          <p className="text-5xl" aria-hidden>
            🧭
          </p>
          <h1 className="prizma-serif ay-metin mt-4 text-2xl font-semibold">
            {t.tamamBaslik}
          </h1>
          <p className="mt-3 text-base leading-relaxed text-slate-300">{t.tamamMetin}</p>
        </div>
      </main>
    );
  }

  // ---- Sohbet ----
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pb-4 pt-6">
      <header className="shrink-0 pb-4 text-center">
        <p className="prizma-serif text-[0.7rem] uppercase tracking-[0.35em] text-slate-400">
          {tr.app.name}
        </p>
        <h1 className="prizma-serif ay-metin mt-1 text-xl font-semibold">{t.baslik}</h1>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto pb-3">
        {mesajlar.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.rol === "ayna" ? "justify-start" : "justify-end"}`}
          >
            <p
              className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-base leading-relaxed ${
                m.rol === "ayna"
                  ? "kart-cam text-slate-100"
                  : "bg-royal/40 text-slate-100"
              }`}
            >
              {m.icerik}
            </p>
          </div>
        ))}
        {mesgul && (
          <div className="flex justify-start">
            <p className="kart-cam max-w-[85%] rounded-2xl px-4 py-2.5 text-sm text-slate-400">
              {t.dusunuyor}
            </p>
          </div>
        )}
        <div ref={altRef} />
      </div>

      {hata && (
        <p role="alert" className="pb-2 text-center text-sm font-medium text-red-400">
          {hata}
        </p>
      )}

      <div className="flex shrink-0 items-end gap-2">
        <textarea
          value={girdi}
          onChange={(e) => setGirdi(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              gonder();
            }
          }}
          rows={1}
          placeholder={t.girisYer}
          className="max-h-32 min-h-[3rem] flex-1 resize-none rounded-2xl border border-royal-light/30 bg-midnight-soft px-4 py-3 text-base text-slate-100 outline-none focus:border-gold"
        />
        <button
          onClick={gonder}
          disabled={mesgul || !girdi.trim()}
          className="btn-kor flex h-12 shrink-0 items-center justify-center rounded-2xl px-5 text-base font-bold disabled:opacity-50"
        >
          {t.gonder}
        </button>
      </div>
    </main>
  );
}
