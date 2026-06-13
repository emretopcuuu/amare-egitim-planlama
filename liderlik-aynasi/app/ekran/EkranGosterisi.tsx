"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { tr } from "@/lib/i18n/tr";
import type { EkranVerisi } from "@/app/api/ekran/route";
import EpicYildizlar from "./EpicYildizlar";

const t = tr.ekran;
const VERI_YOKLAMA_MS = 10_000;
const SLAYT_MS = 14_000;
const SLAYT_SAYISI = 5;

// Takım renk paleti — projeksiyonda ayırt edilebilir, koyu zemine uygun
const TAKIM_RENKLERI = [
  "#fbbf24", // kor amber
  "#9cc3e0", // buz mavisi
  "#34d399", // zümrüt
  "#f472b6", // pembe
  "#60a5fa", // mavi
  "#fb923c", // turuncu
  "#2dd4bf", // turkuaz
  "#e879f9", // fuşya
];

function takimRengi(i: number): string {
  return i < 0 ? "#64748b" : TAKIM_RENKLERI[i % TAKIM_RENKLERI.length];
}

// Ağ yerleşimi: takımlar büyük bir çemberde kümelenir, üyeler küme
// çevresine dizilir. Deterministik — fizik simülasyonu yok, her yenilemede
// aynı görüntü.
function agYerlesimi(veri: EkranVerisi) {
  const W = 1200;
  const H = 640;
  const merkezX = W / 2;
  const merkezY = H / 2;
  const takimSayisi = Math.max(veri.takimlar.length, 1);
  const kumeYaricap = takimSayisi > 1 ? 200 : 0;

  const kumeMerkezleri = new Map<number, { x: number; y: number }>();
  for (let i = 0; i < takimSayisi; i++) {
    const aci = (2 * Math.PI * i) / takimSayisi - Math.PI / 2;
    kumeMerkezleri.set(i, {
      x: merkezX + kumeYaricap * Math.cos(aci),
      y: merkezY + kumeYaricap * Math.sin(aci),
    });
  }
  kumeMerkezleri.set(-1, { x: merkezX, y: merkezY });

  const gruplar = new Map<number, number[]>();
  veri.dugumler.forEach((d, i) => {
    const liste = gruplar.get(d.t) ?? [];
    liste.push(i);
    gruplar.set(d.t, liste);
  });

  const konumlar: { x: number; y: number }[] = new Array(veri.dugumler.length);
  for (const [takim, uyeler] of gruplar) {
    const merkez = kumeMerkezleri.get(takim) ?? { x: merkezX, y: merkezY };
    const r = 36 + uyeler.length * 5;
    uyeler.forEach((dugum, j) => {
      const aci = (2 * Math.PI * j) / uyeler.length;
      konumlar[dugum] = {
        x: merkez.x + r * Math.cos(aci),
        y: merkez.y + r * Math.sin(aci),
      };
    });
  }
  return { W, H, konumlar, kumeMerkezleri };
}

export default function EkranGosterisi() {
  const [veri, setVeri] = useState<EkranVerisi | null>(null);
  const [slayt, setSlayt] = useState(0);
  // SAHNE: tarayıcı sesli oynatmayı kullanıcı dokunuşuna bağlar — kurulumda
  // bir kez "Sesi Aç"a tıklanır, sonrası otomatik. Olaylar bir kez oynar.
  const [sesAcik, setSesAcik] = useState(false);
  const [fieroGoster, setFieroGoster] = useState<{ ad: string } | null>(null);
  const [dalgaVideo, setDalgaVideo] = useState<number | null>(null);
  const sesAcikRef = useRef(false);
  const oynanan = useRef<Set<string>>(new Set());

  useEffect(() => {
    let iptal = false;
    async function yenile() {
      try {
        const res = await fetch("/api/ekran");
        if (!res.ok) return;
        const yeni = (await res.json()) as EkranVerisi;
        if (iptal) return;
        setVeri(yeni);

        // Sahne olayları: her sinyal yalnızca bir kez oynatılır
        const s = yeni.sahne;
        if (s?.fiero && !oynanan.current.has(`f${s.fiero.id}`)) {
          oynanan.current.add(`f${s.fiero.id}`);
          setFieroGoster({ ad: s.fiero.ad });
          setTimeout(() => setFieroGoster(null), 9000);
          if (sesAcikRef.current && s.fiero.sesUrl) {
            void new Audio(s.fiero.sesUrl).play().catch(() => {});
          }
        }
        if (
          s?.dalga &&
          s.dalga.id <= 3 &&
          !oynanan.current.has(`d${s.dalga.olayId}`)
        ) {
          oynanan.current.add(`d${s.dalga.olayId}`);
          setDalgaVideo(s.dalga.id);
        }
        if (s?.anons && !oynanan.current.has(`a${s.anons.id}`)) {
          oynanan.current.add(`a${s.anons.id}`);
          if (sesAcikRef.current && s.anons.sesUrl) {
            void new Audio(s.anons.sesUrl).play().catch(() => {});
          }
        }
      } catch {
        // sahne wifi'ı takıldı: eski veri ekranda kalır, sonraki tur dener
      }
    }
    void yenile();
    const veriZamanlayici = setInterval(yenile, VERI_YOKLAMA_MS);
    const slaytZamanlayici = setInterval(
      () => setSlayt((s) => (s + 1) % SLAYT_SAYISI),
      SLAYT_MS
    );
    return () => {
      iptal = true;
      clearInterval(veriZamanlayici);
      clearInterval(slaytZamanlayici);
    };
  }, []);

  const yerlesim = useMemo(() => (veri ? agYerlesimi(veri) : null), [veri]);
  const siraliOzellikler = useMemo(
    () =>
      veri
        ? [...veri.ozellikler].sort((a, b) => (b.ort ?? -1) - (a.ort ?? -1))
        : [],
    [veri]
  );
  const enYuksekOrt = siraliOzellikler[0]?.ort ?? null;

  return (
    <main className="flex h-screen w-screen flex-col overflow-hidden p-10">
      {/* Ses kapısı: kurulumda tek tıklama, sonrası otomatik anonslar */}
      <button
        onClick={() => {
          sesAcikRef.current = true;
          setSesAcik(true);
        }}
        className={`absolute right-4 top-4 z-30 rounded-lg px-3 py-1.5 text-sm font-semibold ${
          sesAcik
            ? "border border-emerald-400/40 text-emerald-300"
            : "btn-kor"
        }`}
      >
        {sesAcik ? t.sesAcikEtiket : t.sesiAc}
      </button>

      {/* ANLIK DUYURU: host'un sahne kumandasından gönderdiği bant (3 dk) —
          push ölse bile herkesin gördüğü güvenilir kanal. */}
      {veri?.sahne?.duyuru && (
        <div className="fixed inset-x-0 top-0 z-40 bg-gold/95 px-10 py-5 text-center shadow-2xl">
          <p className="font-display text-4xl font-bold text-midnight">
            📣 {veri.sahne.duyuru.metin}
          </p>
        </div>
      )}

      {/* FIERO: 10/10 anı — yıldız patlaması + isim */}
      {fieroGoster && (
        <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center">
          {Array.from({ length: 16 }, (_, i) => (
            <span
              key={i}
              className="yildiz-dogus absolute text-5xl text-gold-light"
              style={{
                left: `${20 + ((i * 37) % 60)}%`,
                top: `${15 + ((i * 23) % 55)}%`,
                animationDelay: `${i * 110}ms`,
              }}
            >
              ✦
            </span>
          ))}
          <p className="parilti rounded-3xl border-2 border-gold/60 bg-[#06121e]/90 px-12 py-8 text-center font-display text-6xl font-bold text-gold-light">
            ✨ {t.fiero(fieroGoster.ad)}
          </p>
        </div>
      )}

      {/* DALGA SİNEMASI: dalga açıldığında perdede tören filmi */}
      {dalgaVideo !== null && (
        <div className="fixed inset-0 z-50 bg-black">
          <video
            src={`/dalga/dalga-${dalgaVideo}.mp4`}
            autoPlay
            playsInline
            muted={!sesAcik}
            onEnded={() => setDalgaVideo(null)}
            onError={() => setDalgaVideo(null)}
            className="h-full w-full object-cover"
          />
        </div>
      )}
      <header className="flex items-end justify-between">
        <div>
          <p className="text-lg font-medium uppercase tracking-[0.3em] text-royal-light">
            {t.altBaslik}
          </p>
          <h1 className="font-display altin-metin mt-1 text-5xl font-bold text-gold">{t.baslik}</h1>
        </div>
        <div className="text-right">
          <p className="text-xl text-slate-400">{veri?.dalgaAdi ?? t.dalgaYok}</p>
          {veri && <EpicYildizlar toplam={veri.toplamPuan} />}
        </div>
      </header>

      {/* SENKRON AN canlı katılım bandı */}
      {veri?.senkron && (
        <div className="parilti mt-4 flex items-center justify-between rounded-2xl border-2 border-gold/50 bg-gold/15 px-8 py-4">
          <p className="text-3xl font-bold text-gold-light">
            ⏰ {t.senkronBaslik}: {veri.senkron.baslik}
          </p>
          <p className="text-3xl font-bold text-slate-100">
            {veri.senkron.yanit}/{veri.senkron.toplam}
            <span className="ml-4 font-mono text-2xl text-amber-300">
              {Math.floor(veri.senkron.kalanSn / 60)}:
              {String(veri.senkron.kalanSn % 60).padStart(2, "0")}
            </span>
          </p>
        </div>
      )}

      <div className="relative mt-8 flex-1">
        {!veri ? (
          <p className="flex h-full items-center justify-center text-2xl text-slate-400">
            {t.veriYok}
          </p>
        ) : (
          <>
            {/* Slayt 1 — Nabız sayaçları */}
            <section
              className={`absolute inset-0 grid grid-cols-2 content-center gap-8 transition-opacity duration-1000 ${
                slayt === 0 ? "opacity-100" : "pointer-events-none opacity-0"
              }`}
            >
              {(
                [
                  [veri.katilimci, t.nabiz.katilimci],
                  [veri.toplamPuan, t.nabiz.puan],
                  [`${veri.ozTamam}/${veri.katilimci}`, t.nabiz.oz],
                  [veri.tamDegerlendirme, t.nabiz.degerlendirme],
                ] as const
              ).map(([deger, etiket]) => (
                <div
                  key={etiket}
                  className="kart-3d rounded-3xl bg-midnight-card/60 p-10 text-center shadow-2xl ring-1 ring-royal/30 backdrop-blur"
                >
                  <p className="font-mono text-8xl font-bold text-gold">{deger}</p>
                  <p className="mt-3 text-2xl text-slate-300">{etiket}</p>
                </div>
              ))}
            </section>

            {/* Slayt 2 — Takım kimyası ağ haritası */}
            <section
              className={`absolute inset-0 flex flex-col transition-opacity duration-1000 ${
                slayt === 1 ? "opacity-100" : "pointer-events-none opacity-0"
              }`}
            >
              <div className="flex items-baseline justify-between">
                <h2 className="text-3xl font-semibold text-gold-light">
                  {t.agBaslik}
                </h2>
                {veri.caprazOran !== null && (
                  <p className="text-xl text-gold">{t.agCapraz(veri.caprazOran)}</p>
                )}
              </div>
              <p className="mt-1 text-lg text-slate-400">{t.agAciklama}</p>

              {yerlesim && (
                <svg
                  viewBox={`0 0 ${yerlesim.W} ${yerlesim.H}`}
                  className="mt-2 min-h-0 w-full flex-1"
                >
                  {veri.baglar.map((b, i) => {
                    const k1 = yerlesim.konumlar[b.a];
                    const k2 = yerlesim.konumlar[b.b];
                    if (!k1 || !k2) return null;
                    return (
                      <line
                        key={i}
                        x1={k1.x}
                        y1={k1.y}
                        x2={k2.x}
                        y2={k2.y}
                        stroke={b.capraz ? "#f59e0b" : "#4e7ca6"}
                        strokeOpacity={b.capraz ? 0.55 : 0.3}
                        strokeWidth={b.capraz ? 2 : 1.2}
                      />
                    );
                  })}
                  {veri.dugumler.map((d, i) => {
                    const k = yerlesim.konumlar[i];
                    if (!k) return null;
                    return (
                      <circle
                        key={i}
                        cx={k.x}
                        cy={k.y}
                        r={9}
                        fill={takimRengi(d.t)}
                        stroke="#06121e"
                        strokeWidth={2}
                      />
                    );
                  })}
                  {veri.takimlar.map((ad, i) => {
                    const merkez = yerlesim.kumeMerkezleri.get(i);
                    if (!merkez) return null;
                    return (
                      <text
                        key={ad}
                        x={merkez.x}
                        y={merkez.y + 5}
                        textAnchor="middle"
                        fill={takimRengi(i)}
                        fontSize={22}
                        fontWeight={700}
                      >
                        {ad}
                      </text>
                    );
                  })}
                </svg>
              )}
            </section>

            {/* Slayt 3 — Özellik ortalamaları */}
            <section
              className={`absolute inset-0 flex flex-col transition-opacity duration-1000 ${
                slayt === 2 ? "opacity-100" : "pointer-events-none opacity-0"
              }`}
            >
              <h2 className="text-3xl font-semibold text-gold-light">
                💪 {t.ozellikBaslik}
              </h2>
              <p className="mt-1 text-lg text-slate-400">{t.ozellikAciklama}</p>
              <ul className="mt-6 flex min-h-0 flex-1 flex-col justify-between gap-2">
                {siraliOzellikler.map((o, i) => (
                  <li key={o.ad} className="flex items-center gap-5">
                    <span className="w-64 truncate text-right text-xl font-medium text-slate-100">
                      {o.ad}
                    </span>
                    <div className="h-6 flex-1 overflow-hidden rounded-full bg-midnight-card/80">
                      <div
                        className="h-full rounded-full transition-all duration-1000"
                        style={{
                          width: `${((o.ort ?? 0) / 10) * 100}%`,
                          background:
                            i === 0
                              ? "linear-gradient(90deg, #f59e0b, #fbbf24)"
                              : "linear-gradient(90deg, #4e7ca6, #9cc3e0)",
                        }}
                      />
                    </div>
                    <span className="w-16 font-mono text-xl font-bold text-gold-light">
                      {o.ort === null ? "—" : o.ort.toFixed(1)}
                    </span>
                    {i === 0 && enYuksekOrt !== null && (
                      <span className="text-2xl">👑</span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
            {/* Slayt 4 — Kıvılcım Ligi */}
            <section
              className={`absolute inset-0 flex flex-col transition-opacity duration-1000 ${
                slayt === 3 ? "opacity-100" : "pointer-events-none opacity-0"
              }`}
            >
              <h2 className="text-3xl font-semibold text-gold-light">
                {t.ligBaslik}
              </h2>
              <p className="mt-1 text-lg text-slate-400">{t.ligAciklama}</p>

              {veri.lig.length === 0 ? (
                <p className="flex flex-1 items-center justify-center text-xl text-slate-400">
                  {t.ligBos}
                </p>
              ) : (
                <div className="mt-6 grid min-h-0 flex-1 grid-cols-1 gap-8 lg:grid-cols-2">
                  <ol className="space-y-3">
                    {veri.lig.map((k, i) => (
                      <li
                        key={k.ad}
                        className="flex items-center gap-4 kart-3d rounded-2xl bg-midnight-card/60 p-4 ring-1 ring-gold/20"
                      >
                        <span className="w-10 text-center text-3xl">
                          {["🥇", "🥈", "🥉"][i] ?? `${i + 1}.`}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-2xl font-semibold text-slate-100">
                          {k.ad}
                        </span>
                        <span className="text-lg text-royal-light">{k.unvan}</span>
                        <span className="font-mono text-2xl font-bold text-gold">
                          {k.kivilcim} ⚡
                        </span>
                      </li>
                    ))}
                  </ol>
                  <div>
                    <h3 className="text-xl font-semibold text-slate-300">
                      {t.ligTakimlar}
                    </h3>
                    <ul className="mt-4 space-y-4">
                      {veri.takimLigi.map((tk, i) => {
                        const enYuksek = veri.takimLigi[0]?.kivilcim ?? 1;
                        return (
                          <li key={tk.takim}>
                            <div className="flex items-baseline justify-between">
                              <span className="text-xl font-medium text-slate-100">
                                {tk.takim} {i === 0 && "👑"}
                              </span>
                              <span className="font-mono text-xl font-bold text-gold-light">
                                {tk.kivilcim} ⚡
                              </span>
                            </div>
                            <div className="mt-1.5 h-4 w-full overflow-hidden rounded-full bg-midnight-card/80">
                              <div
                                className="h-full rounded-full transition-all duration-1000"
                                style={{
                                  width: `${(tk.kivilcim / enYuksek) * 100}%`,
                                  background:
                                    "linear-gradient(90deg, #f59e0b, #fbbf24)",
                                }}
                              />
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              )}
            </section>
            {/* Slayt 5 — Anı Duvarı */}
            <section
              className={`absolute inset-0 flex flex-col transition-opacity duration-1000 ${
                slayt === 4 ? "opacity-100" : "pointer-events-none opacity-0"
              }`}
            >
              <h2 className="text-3xl font-semibold text-gold-light">{t.duvarBaslik}</h2>
              {veri.anilar.length === 0 ? (
                <p className="flex flex-1 items-center justify-center text-xl text-slate-400">
                  {t.duvarBos}
                </p>
              ) : (
                <div className="mt-6 grid grid-cols-3 gap-4 lg:grid-cols-4">
                  {veri.anilar.map((url, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={i}
                      src={url}
                      alt=""
                      className="aspect-square w-full rounded-2xl object-cover ring-1 ring-white/10"
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {/* Slayt göstergesi */}
      <footer className="mt-6 flex justify-center gap-3">
        {Array.from({ length: SLAYT_SAYISI }, (_, i) => (
          <button
            key={i}
            onClick={() => setSlayt(i)}
            aria-label={`Slayt ${i + 1}`}
            className={`h-2.5 rounded-full transition-all ${
              slayt === i ? "w-10 bg-gold" : "w-2.5 bg-slate-600"
            }`}
          />
        ))}
      </footer>
    </main>
  );
}
