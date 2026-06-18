"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { tr } from "@/lib/i18n/tr";
import { titret } from "@/lib/his";
import MikrofonButonu from "@/components/MikrofonButonu";

const t = tr.kocu;

type Mesaj = { rol: string; icerik: string };

export default function KocuSohbet({ hafiza = null }: { hafiza?: string | null }) {
  const [mesajlar, setMesajlar] = useState<Mesaj[]>([]);
  const [girdi, setGirdi] = useState("");
  const [yukleniyor, setYukleniyor] = useState(true);
  const [yaziyor, setYaziyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [sesli, setSesli] = useState(false);
  const altRef = useRef<HTMLDivElement>(null);
  const alanRef = useRef<HTMLTextAreaElement>(null);
  const baslatildi = useRef(false);

  // İlk yük: geçmişi getir; boşsa karşılama repliğini iste.
  useEffect(() => {
    if (baslatildi.current) return;
    baslatildi.current = true;
    (async () => {
      try {
        const r = await fetch("/api/kocu");
        const d = r.ok ? await r.json() : null;
        const gecmis: Mesaj[] = d?.gecmis ?? [];
        if (gecmis.length) {
          setMesajlar(gecmis);
          setYukleniyor(false);
        } else {
          setYukleniyor(false);
          await karsila();
        }
      } catch {
        setYukleniyor(false);
        setHata(t.hata);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    altRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mesajlar, yaziyor]);

  useEffect(() => {
    const el = alanRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [girdi]);

  // GELİŞTİRME #7: AYNA yanıtını sesli oku (tarayıcı TTS, tr-TR) — hands-free koç.
  function seslendir(metin: string) {
    try {
      const ss = window.speechSynthesis;
      if (!ss) return;
      ss.cancel();
      const u = new SpeechSynthesisUtterance(metin);
      u.lang = "tr-TR";
      const trSes = ss.getVoices().find((v) => v.lang?.toLowerCase().startsWith("tr"));
      if (trSes) u.voice = trSes;
      ss.speak(u);
    } catch {}
  }

  async function karsila() {
    setYaziyor(true);
    setHata(null);
    try {
      const r = await fetch("/api/kocu", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mesaj: null }),
      });
      const d = r.ok ? await r.json() : null;
      if (d?.mesaj) {
        setMesajlar((m) => [...m, { rol: "ayna", icerik: d.mesaj }]);
        if (sesli) seslendir(d.mesaj);
      } else setHata(t.uretilemedi);
    } catch {
      setHata(t.hata);
    } finally {
      setYaziyor(false);
    }
  }

  async function gonder() {
    const metin = girdi.trim();
    if (!metin || yaziyor) return;
    titret(8);
    setGirdi("");
    setHata(null);
    setMesajlar((m) => [...m, { rol: "kullanici", icerik: metin }]);
    setYaziyor(true);
    try {
      const r = await fetch("/api/kocu", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mesaj: metin }),
      });
      const d = r.ok ? await r.json() : null;
      if (d?.mesaj) {
        setMesajlar((m) => [...m, { rol: "ayna", icerik: d.mesaj }]);
        if (sesli) seslendir(d.mesaj);
      } else setHata(t.uretilemedi);
    } catch {
      setHata(t.hata);
    } finally {
      setYaziyor(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-white/10 bg-midnight/90 px-4 py-3 backdrop-blur">
        <Link href="/" aria-label={t.geri} className="text-slate-400 hover:text-slate-200">
          ←
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-2xl" aria-hidden>🪞</span>
          <div>
            <p className="prizma-serif ay-metin text-base font-semibold leading-none">{t.baslik}</p>
            <p className="mt-0.5 text-[0.7rem] text-slate-500">{t.altBaslik}</p>
          </div>
        </div>
        {/* #7 Sesli mod: AYNA yanıtlarını sesli oku */}
        <button
          onClick={() => {
            setSesli((s) => {
              if (s) try { window.speechSynthesis?.cancel(); } catch {}
              return !s;
            });
          }}
          aria-pressed={sesli}
          aria-label={t.sesliMod}
          className={`ml-auto flex h-10 w-10 items-center justify-center rounded-xl text-lg transition-colors ${
            sesli ? "bg-gold/20 text-gold-light" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          {sesli ? "🔊" : "🔇"}
        </button>
      </header>

      {/* #4 Hafıza şeridi: AYNA'nın kişi hakkında bildiği çekirdek — "seni hatırlıyorum" */}
      {hafiza && (
        <div className="border-b border-white/5 bg-gold/[0.06] px-4 py-2.5">
          <p className="text-[0.7rem] leading-relaxed text-slate-300">
            <span className="mr-1.5 font-semibold text-gold-light">{t.hafizaBaslik}</span>
            {hafiza}
          </p>
        </div>
      )}

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-5">
        {yukleniyor && <p className="text-center text-sm text-slate-500">{t.yukleniyor}</p>}

        {mesajlar.map((m, i) => (
          <div key={i} className={`flex ${m.rol === "ayna" ? "justify-start" : "justify-end"}`}>
            <div
              className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-[0.95rem] leading-relaxed ${
                m.rol === "ayna"
                  ? "rounded-tl-sm bg-royal/25 text-slate-100 ring-1 ring-royal/30"
                  : "rounded-tr-sm bg-gold/15 text-slate-100 ring-1 ring-gold/25"
              }`}
            >
              {m.icerik}
            </div>
          </div>
        ))}

        {yaziyor && (
          <div className="flex justify-start">
            <div className="flex gap-1 rounded-2xl rounded-tl-sm bg-royal/20 px-4 py-3">
              <span className="h-2 w-2 animate-bounce rounded-full bg-slate-300 [animation-delay:-0.3s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-slate-300 [animation-delay:-0.15s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-slate-300" />
            </div>
          </div>
        )}

        {hata && <p role="alert" className="text-center text-sm font-medium text-red-400">{hata}</p>}
        <div ref={altRef} />
      </div>

      <div className="sticky bottom-0 border-t border-white/10 bg-midnight/95 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur">
        <div className="flex items-end gap-2">
          <textarea
            ref={alanRef}
            value={girdi}
            onChange={(e) => setGirdi(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                gonder();
              }
            }}
            rows={1}
            placeholder={t.yer}
            className="max-h-[140px] min-h-[3rem] flex-1 resize-none rounded-2xl border-2 border-white/15 bg-white/[0.04] px-4 py-3 text-base text-slate-100 outline-none placeholder:text-slate-500 focus:border-gold"
          />
          <MikrofonButonu onMetin={(p) => setGirdi((g) => (g.trim() ? `${g.trim()} ${p}` : p))} />
          <button
            onClick={gonder}
            disabled={!girdi.trim() || yaziyor}
            aria-label={t.gonder}
            className="btn-kor flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-xl font-bold disabled:opacity-40"
          >
            ↑
          </button>
        </div>
      </div>
    </div>
  );
}
