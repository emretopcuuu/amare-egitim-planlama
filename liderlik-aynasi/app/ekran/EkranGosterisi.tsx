"use client";

import { useEffect, useMemo, useState } from "react";
import { tr } from "@/lib/i18n/tr";
import type { EkranVerisi } from "@/app/api/ekran/route";

const t = tr.ekran;
const VERI_YOKLAMA_MS = 10_000;
const SLAYT_MS = 14_000;
const SLAYT_SAYISI = 3;

// Takım renk paleti — projeksiyonda ayırt edilebilir, koyu zemine uygun
const TAKIM_RENKLERI = [
  "#f0c75e", // altın
  "#a78bfa", // mor
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

  useEffect(() => {
    let iptal = false;
    async function yenile() {
      try {
        const res = await fetch("/api/ekran");
        if (!res.ok) return;
        const yeni = (await res.json()) as EkranVerisi;
        if (!iptal) setVeri(yeni);
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
      <header className="flex items-end justify-between">
        <div>
          <p className="text-lg font-medium uppercase tracking-[0.3em] text-royal-light">
            {t.altBaslik}
          </p>
          <h1 className="mt-1 text-5xl font-bold text-gold">{t.baslik}</h1>
        </div>
        <p className="text-xl text-slate-400">{veri?.dalgaAdi ?? t.dalgaYok}</p>
      </header>

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
                  className="rounded-3xl bg-midnight-card/60 p-10 text-center shadow-2xl ring-1 ring-royal/30 backdrop-blur"
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
                        stroke={b.capraz ? "#d4af37" : "#7c3aed"}
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
                        stroke="#1e1233"
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
                              ? "linear-gradient(90deg, #d4af37, #f0c75e)"
                              : "linear-gradient(90deg, #7c3aed, #a78bfa)",
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
