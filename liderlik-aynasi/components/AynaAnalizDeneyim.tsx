"use client";

import { useEffect, useRef, useState } from "react";
import { tr } from "@/lib/i18n/tr";
import { titret } from "@/lib/his";

const t = tr.analiz;

type Veri = { metin: string; sesUrl: string | null; yenidenKullanildi: boolean };
type Asama = "kamp_oncesi" | "aksam_1" | "aksam_2" | "cikis";

// AYNA'NIN ANALİZİ — tam ekran: dönen ayna videosu + Star Wars gibi aynanın içine
// akan metin + kişinin KENDİ klon sesiyle okuma. "Yeniden değerlendir" hakkı (sebep
// zorunlu, bir kez). Mühür ekranındaki kart + /analizlerim listesi bunu açar.
export default function AynaAnalizDeneyim({
  asama,
  etiket,
  altEtiket,
  hazir,
}: {
  asama: Asama;
  etiket: string;
  altEtiket?: string;
  // Liste sayfası analizi sunucuda hazırsa; mühür kartı boş bırakır, dokununca çeker.
  hazir?: Veri | null;
}) {
  const [acik, setAcik] = useState(false);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [veri, setVeri] = useState<Veri | null>(hazir ?? null);
  const [hata, setHata] = useState<string | null>(null);

  const [caliyor, setCaliyor] = useState(false);
  const [sure, setSure] = useState(26); // akış süresi (sn) — sese eşitlenir
  const [akisKey, setAkisKey] = useState(0); // animasyonu yeniden tetiklemek için
  const [metniGoster, setMetniGoster] = useState(false);

  const [yenidenAcik, setYenidenAcik] = useState(false);
  const [sebep, setSebep] = useState("");
  const [gonderiliyor, setGonderiliyor] = useState(false);

  const ses = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      ses.current?.pause();
    };
  }, []);

  // Tam ekran sahne açıkken global çubuklar (üstte KimsinBant, altta AltNav)
  // katmanın üstüne binmesin / X'i kapatmasın: mevcut "ortu-acik" mekanizması
  // ikisini de CSS ile gizler. Kapanış/unmount'ta temizle.
  useEffect(() => {
    document.body.classList.toggle("ortu-acik", acik);
    return () => document.body.classList.remove("ortu-acik");
  }, [acik]);

  async function ac() {
    titret(8);
    setAcik(true);
    setMetniGoster(false);
    if (veri) return;
    setYukleniyor(true);
    setHata(null);
    try {
      const r = await fetch(`/api/ayna-analiz?asama=${asama}`);
      const d = await r.json();
      if (d?.durum === "hazir") setVeri({ metin: d.metin, sesUrl: d.sesUrl, yenidenKullanildi: d.yenidenKullanildi });
      else setHata(d?.durum === "veri-yok" ? t.veriYok : t.hata);
    } catch {
      setHata(t.hata);
    } finally {
      setYukleniyor(false);
    }
  }

  function kapat() {
    ses.current?.pause();
    setCaliyor(false);
    setAcik(false);
    setYenidenAcik(false);
  }

  function akisiBaslat(s: number) {
    setSure(s);
    setAkisKey((k) => k + 1); // remount → animasyon baştan
    setCaliyor(true);
  }

  function oynat() {
    if (!veri) return;
    if (caliyor) {
      ses.current?.pause();
      setCaliyor(false);
      return;
    }
    if (veri.sesUrl) {
      if (!ses.current) {
        ses.current = new Audio(veri.sesUrl);
        ses.current.onended = () => setCaliyor(false);
      }
      const a = ses.current;
      const basla = () => akisiBaslat(a.duration && isFinite(a.duration) ? a.duration : tahminiSure(veri.metin));
      if (a.readyState >= 1 && a.duration && isFinite(a.duration)) basla();
      else a.onloadedmetadata = basla;
      void a.play().catch(() => {
        // Ses çalınamazsa yine de metin aksın.
        akisiBaslat(tahminiSure(veri.metin));
      });
    } else {
      akisiBaslat(tahminiSure(veri.metin));
    }
  }

  async function yenidenGonder() {
    const s = sebep.trim();
    if (s.length < 10 || gonderiliyor) return;
    setGonderiliyor(true);
    setHata(null);
    try {
      const r = await fetch("/api/ayna-analiz", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ asama, sebep: s }),
      });
      const d = await r.json();
      if (d?.durum === "hazir") {
        ses.current?.pause();
        ses.current = null;
        setVeri({ metin: d.metin, sesUrl: d.sesUrl, yenidenKullanildi: true });
        setYenidenAcik(false);
        setSebep("");
        setCaliyor(false);
        setMetniGoster(true);
      } else {
        setHata(d?.durum === "sebep-gerekli" ? t.sebepKisa : t.hata);
      }
    } catch {
      setHata(t.hata);
    } finally {
      setGonderiliyor(false);
    }
  }

  return (
    <>
      {/* TETİK — mühür kartı ya da liste öğesi */}
      <button
        onClick={ac}
        className="ayna-vurgu group relative flex w-full items-center gap-3 overflow-hidden rounded-2xl border border-gold/40 bg-gradient-to-br from-gold/10 to-midnight-card/60 p-4 text-left transition-colors hover:border-gold/55"
      >
        <span className="text-2xl" aria-hidden>🪞</span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-gold-light">{etiket}</span>
          {altEtiket && <span className="mt-0.5 block text-xs text-slate-400">{altEtiket}</span>}
        </span>
        <span className="shrink-0 text-gold-light/70 transition-transform group-hover:translate-x-0.5">→</span>
      </button>

      {/* TAM EKRAN AYNA SAHNESİ */}
      {acik && (
        <div className="koyu-alan fixed inset-0 z-[70] flex flex-col bg-[#04101c]">
          {/* Dönen ayna videosu — sahnenin nefesi */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <video
              src="/ayna-girdap.mp4"
              muted
              loop
              autoPlay
              playsInline
              className="h-full w-full object-cover opacity-30"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#04101c]/70 via-[#04101c]/40 to-[#04101c]/90" />
          </div>

          {/* Kapat — büyük, net dokunma hedefi; her şeyin üstünde (z-20) */}
          <div className="relative z-20 flex shrink-0 items-center justify-between px-5 pt-[calc(0.75rem+env(safe-area-inset-top))]">
            <span className="text-xs font-semibold uppercase tracking-[0.3em] text-gold-light/70">
              {t.asamaAd[asama]}
            </span>
            <button
              onClick={kapat}
              aria-label={t.kapat}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-white/15 text-3xl text-slate-100 shadow-lg ring-1 ring-white/20 transition-colors hover:bg-white/25 active:bg-white/30"
            >
              ✕
            </button>
          </div>

          {/* GÖVDE */}
          <div className="relative z-10 flex min-h-0 flex-1 flex-col px-5">
            {yukleniyor && (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
                <span className="text-5xl" aria-hidden>🪞</span>
                <p className="prizma-serif ay-metin text-lg">{t.yukleniyor}</p>
                <span className="flex gap-1.5">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-gold [animation-delay:-0.3s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-gold [animation-delay:-0.15s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-gold" />
                </span>
              </div>
            )}

            {hata && !yukleniyor && (
              <div className="flex flex-1 items-center justify-center px-6 text-center">
                <p className="text-sm font-medium text-amber-300">{hata}</p>
              </div>
            )}

            {veri && !yukleniyor && (
              <div className="flex min-h-0 flex-1 flex-col">
                {/* Çerçeve — sabit, AI değil */}
                <p className="mx-auto mt-1 max-w-md shrink-0 text-center text-[0.72rem] leading-relaxed text-slate-400">
                  {t.cerceve[asama]}
                </p>

                {/* AKIŞ ya da SABİT METİN */}
                {metniGoster ? (
                  <div className="mx-auto my-4 w-full max-w-md flex-1 overflow-y-auto">
                    <p className="prizma-serif ay-metin whitespace-pre-line text-lg leading-relaxed">
                      {veri.metin}
                    </p>
                  </div>
                ) : (
                  <div className="ayna-perspektif ayna-maske relative my-2 min-h-0 flex-1 overflow-hidden">
                    <div className="ayna-egim absolute inset-x-0 bottom-0 flex justify-center">
                      <p
                        key={akisKey}
                        className={`prizma-serif ay-metin mx-auto max-w-md px-2 text-center text-[1.35rem] font-semibold leading-relaxed ${
                          caliyor ? "ayna-akan" : "opacity-0"
                        }`}
                        style={{ animationDuration: `${sure}s` }}
                      >
                        {veri.metin}
                      </p>
                    </div>
                  </div>
                )}

                {/* Uyarı — sabit */}
                <p className="mx-auto max-w-md shrink-0 text-center text-[0.68rem] italic leading-relaxed text-slate-500">
                  {t.uyari}
                </p>

                {/* KONTROLLER */}
                <div className="shrink-0 space-y-2.5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3">
                  <div className="flex gap-2">
                    <button
                      onClick={oynat}
                      className="btn-kor flex h-12 flex-1 items-center justify-center gap-2 rounded-xl text-sm font-bold"
                    >
                      {caliyor ? `⏸ ${t.durdur}` : `▶ ${veri.sesUrl ? t.oynatSesli : t.oynat}`}
                    </button>
                    <button
                      onClick={() => setMetniGoster((g) => !g)}
                      className="flex h-12 items-center justify-center rounded-xl border border-white/15 px-4 text-sm font-semibold text-slate-200 hover:bg-white/[0.06]"
                    >
                      {metniGoster ? t.akisaDon : t.metniOku}
                    </button>
                  </div>

                  {/* Yeniden değerlendir — hak bir kez, sebep zorunlu */}
                  {!veri.yenidenKullanildi && !yenidenAcik && (
                    <button
                      onClick={() => setYenidenAcik(true)}
                      className="w-full text-center text-xs font-medium text-slate-400 underline-offset-4 hover:text-slate-200 hover:underline"
                    >
                      🔄 {t.yeniden}
                    </button>
                  )}
                  {veri.yenidenKullanildi && (
                    <p className="text-center text-[0.68rem] text-slate-500">{t.yenidenKilit}</p>
                  )}

                  {yenidenAcik && (
                    <div className="rounded-2xl border border-royal/30 bg-midnight-card/80 p-3">
                      <p className="text-xs font-semibold text-slate-200">{t.yenidenBaslik}</p>
                      <p className="mt-1 text-[0.7rem] leading-relaxed text-slate-400">
                        {t.yenidenAciklama}
                      </p>
                      <textarea
                        value={sebep}
                        onChange={(e) => setSebep(e.target.value)}
                        rows={3}
                        placeholder={t.yenidenYer}
                        className="mt-2 w-full resize-none rounded-xl border border-white/15 bg-midnight-soft/50 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-gold"
                      />
                      <div className="mt-2 flex gap-2">
                        <button
                          onClick={() => {
                            setYenidenAcik(false);
                            setSebep("");
                          }}
                          className="h-10 flex-1 rounded-xl border border-white/15 text-xs font-semibold text-slate-300"
                        >
                          {t.vazgec}
                        </button>
                        <button
                          onClick={yenidenGonder}
                          disabled={sebep.trim().length < 10 || gonderiliyor}
                          className="btn-kor h-10 flex-1 rounded-xl text-xs font-bold disabled:opacity-40"
                        >
                          {gonderiliyor ? t.yenidenBekle : t.yenidenGonder}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function tahminiSure(metin: string): number {
  const kelime = metin.trim().split(/\s+/).length;
  return Math.max(16, Math.min(80, Math.round(kelime / 2.1)));
}
