"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { tr } from "@/lib/i18n/tr";

const t = tr.admin.kurulum;

// 3 adımlı stepper: 1) CSV yükle (kod otomatik) → 2) kodlar hazır → 3) QR yazdır.
// Aktif adım katılımcı sayısından türetilir: 0 ise 1. adım, varsa 3. adım.
export default function KurulumSihirbazi({
  katilimciSayisi,
}: {
  katilimciSayisi: number;
}) {
  const router = useRouter();
  const dosyaRef = useRef<HTMLInputElement>(null);
  const [dosyaAdi, setDosyaAdi] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  const listeVar = katilimciSayisi > 0;
  const aktif = listeVar ? 3 : 1;

  async function iceAktar() {
    const dosya = dosyaRef.current?.files?.[0];
    if (!dosya || yukleniyor) return;
    setYukleniyor(true);
    setHata(null);
    try {
      const csv = await dosya.text();
      const res = await fetch("/api/admin/katilimcilar", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ csv }),
      });
      if (!res.ok) {
        const veri = await res.json().catch(() => null);
        setHata(veri?.hata ?? t.hata);
        return;
      }
      if (dosyaRef.current) dosyaRef.current.value = "";
      setDosyaAdi(null);
      router.refresh();
    } catch {
      setHata(t.hata);
    } finally {
      setYukleniyor(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Adım göstergesi */}
      <div className="flex items-center justify-center gap-2">
        {[1, 2, 3].map((n) => (
          <div key={n} className="flex items-center gap-2">
            <span
              className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${
                n < aktif || (n <= 2 && listeVar)
                  ? "bg-emerald-500 text-white"
                  : n === aktif
                    ? "bg-gold text-midnight"
                    : "bg-midnight-soft text-slate-500"
              }`}
            >
              {n < aktif || (n <= 2 && listeVar) ? "✓" : n}
            </span>
            {n < 3 && <span className="h-0.5 w-6 bg-white/15" />}
          </div>
        ))}
      </div>

      {/* Adım 1: CSV yükle */}
      <Adim no={1} aktif={aktif === 1} tamam={listeVar} baslik={t.adim1Baslik}>
        {listeVar ? (
          <p className="text-sm font-medium text-emerald-300">
            ✓ {t.adim1Tamam(katilimciSayisi)}
          </p>
        ) : (
          <>
            <p className="text-sm text-slate-400">{t.adim1Aciklama}</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <label className="cursor-pointer rounded-lg border border-royal-light/40 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-midnight-soft">
                {dosyaAdi ?? t.dosyaSec}
                <input
                  ref={dosyaRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    setDosyaAdi(e.target.files?.[0]?.name ?? null);
                    setHata(null);
                  }}
                />
              </label>
              <button
                onClick={iceAktar}
                disabled={!dosyaAdi || yukleniyor}
                className="rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-midnight transition-colors hover:bg-gold-light disabled:cursor-not-allowed disabled:opacity-40"
              >
                {yukleniyor ? t.yukleniyor : t.yukle}
              </button>
            </div>
            {hata && (
              <p role="alert" className="mt-2 text-sm font-medium text-red-400">
                {hata}
              </p>
            )}
          </>
        )}
      </Adim>

      {/* Adım 2: Kodlar hazır */}
      <Adim no={2} aktif={false} tamam={listeVar} baslik={t.adim2Baslik}>
        {listeVar ? (
          <>
            <p className="text-sm text-slate-300">{t.adim2Aciklama(katilimciSayisi)}</p>
            <Link
              href="/admin/katilimcilar"
              className="mt-3 inline-flex rounded-lg border border-royal-light/40 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-midnight-soft"
            >
              {t.listeyiGor}
            </Link>
          </>
        ) : (
          <p className="text-sm text-slate-500">{t.adim2Aciklama(0)}</p>
        )}
      </Adim>

      {/* Adım 3: QR yazdır */}
      <Adim no={3} aktif={aktif === 3} tamam={false} baslik={t.adim3Baslik}>
        <p className="text-sm text-slate-400">{t.adim3Aciklama}</p>
        <Link
          href="/admin/qr"
          aria-disabled={!listeVar}
          className={`mt-3 inline-flex h-12 items-center justify-center rounded-xl px-6 text-base font-bold transition-colors ${
            listeVar
              ? "bg-gold text-midnight hover:bg-gold-light"
              : "pointer-events-none bg-midnight-soft text-slate-500"
          }`}
        >
          {t.qrYazdir}
        </Link>
      </Adim>

      {listeVar && (
        <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/5 p-5 text-center">
          <p className="text-lg font-bold text-emerald-300">{t.tamamBaslik}</p>
          <p className="mt-1 text-sm text-slate-300">{t.tamamAciklama}</p>
        </div>
      )}
    </div>
  );
}

function Adim({
  no,
  aktif,
  tamam,
  baslik,
  children,
}: {
  no: number;
  aktif: boolean;
  tamam: boolean;
  baslik: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`kart-3d rounded-2xl p-5 shadow-xl ring-1 backdrop-blur ${
        aktif ? "bg-midnight-card/80 ring-gold/50" : "bg-midnight-card/50 ring-royal/20"
      }`}
    >
      <h2 className="flex items-center gap-2 text-base font-semibold text-gold-light">
        <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
          {tr.admin.kurulum.adimEtiket(no)}
        </span>
        {tamam && <span className="text-emerald-400">✓</span>}
        {baslik}
      </h2>
      <div className="mt-2">{children}</div>
    </section>
  );
}
