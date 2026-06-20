"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { tr } from "@/lib/i18n/tr";
import AsamaRayi, { type RayAsama } from "@/components/AsamaRayi";

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
  // Geri/düzelt: liste yüklendikten sonra bile yeniden yükleyip düzeltme.
  const [duzeltModu, setDuzeltModu] = useState(false);

  const listeVar = katilimciSayisi > 0;
  const aktif = listeVar && !duzeltModu ? 3 : 1;
  // Adım 1'in yükleme arayüzü: liste yoksa ya da admin düzeltmeye döndüyse açık.
  const yuklemeAcik = !listeVar || duzeltModu;

  // AŞAMA RAYI durumları — sıradaki adım hep adıyla görünür.
  const ray: RayAsama[] = [
    { ad: t.adim1Baslik, durum: listeVar && !duzeltModu ? "tamam" : "simdi" },
    { ad: t.adim2Baslik, durum: listeVar ? "tamam" : "bekliyor" },
    { ad: t.adim3Baslik, durum: listeVar && !duzeltModu ? "simdi" : "bekliyor" },
  ];

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
      setDuzeltModu(false);
      router.refresh();
    } catch {
      setHata(t.hata);
    } finally {
      setYukleniyor(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* AŞAMA RAYI — adımlar adlarıyla; sıradaki hep görünür */}
      <AsamaRayi asamalar={ray} className="px-2" />

      {/* Adım 1: CSV yükle (liste varsa "✓" + düzelt; düzeltmede yükleme açık) */}
      <Adim no={1} aktif={aktif === 1} tamam={listeVar && !duzeltModu} baslik={t.adim1Baslik}>
        {listeVar && !duzeltModu ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-emerald-300">
              ✓ {t.adim1Tamam(katilimciSayisi)}
            </p>
            {/* Geri/düzelt: listeyi değiştir / yeniden yükle */}
            <button
              onClick={() => {
                setDuzeltModu(true);
                setHata(null);
              }}
              className="text-sm text-slate-400 underline-offset-4 hover:text-slate-200 hover:underline"
            >
              {t.adim1Duzelt}
            </button>
          </div>
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
              {/* Düzeltmeden vazgeç (liste zaten varsa) */}
              {listeVar && duzeltModu && (
                <button
                  onClick={() => {
                    setDuzeltModu(false);
                    setDosyaAdi(null);
                    setHata(null);
                  }}
                  className="text-sm text-slate-500 underline-offset-4 hover:text-slate-300 hover:underline"
                >
                  {t.duzeltVazgec}
                </button>
              )}
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
              ? "btn-kor"
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
