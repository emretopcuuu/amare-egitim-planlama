"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { tr } from "@/lib/i18n/tr";

const t = tr.admin.katilimcilar;

const BOS_KISI = { ad: "", takim: "", sehir: "", telefon: "", eposta: "" };

export default function KatilimciAraclari() {
  const router = useRouter();
  const dosyaRef = useRef<HTMLInputElement>(null);
  const [dosyaAdi, setDosyaAdi] = useState<string | null>(null);
  const [mesaj, setMesaj] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [silOnay, setSilOnay] = useState("");
  const [siliniyor, setSiliniyor] = useState(false);

  // Manuel tek kişi ekleme
  const [kisi, setKisi] = useState({ ...BOS_KISI });
  const [ekleniyor, setEkleniyor] = useState(false);
  const [ekleMesaj, setEkleMesaj] = useState<string | null>(null);
  const [ekleHata, setEkleHata] = useState<string | null>(null);

  async function kisiEkle() {
    if (!kisi.ad.trim() || ekleniyor) return;
    setEkleniyor(true);
    setEkleMesaj(null);
    setEkleHata(null);
    try {
      const res = await fetch("/api/admin/katilimcilar", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(kisi),
      });
      const veri = await res.json().catch(() => null);
      if (!res.ok) {
        setEkleHata(veri?.hata ?? t.hataSunucu);
        return;
      }
      setEkleMesaj(t.ekleBasarili(veri.ad, veri.kod));
      setKisi({ ...BOS_KISI });
      router.refresh();
    } catch {
      setEkleHata(t.hataSunucu);
    } finally {
      setEkleniyor(false);
    }
  }

  // CSV ya da Excel (.xlsx) dosyasını CSV metnine çevir
  async function dosyayiCsvYap(dosya: File): Promise<string> {
    if (/\.xlsx?$/i.test(dosya.name) && !/\.csv$/i.test(dosya.name)) {
      const XLSX = await import("xlsx");
      const buf = await dosya.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      return XLSX.utils.sheet_to_csv(ws);
    }
    return dosya.text();
  }

  async function iceAktar() {
    const dosya = dosyaRef.current?.files?.[0];
    if (!dosya || yukleniyor) return;
    setYukleniyor(true);
    setMesaj(null);
    setHata(null);
    try {
      let csv: string;
      try {
        csv = await dosyayiCsvYap(dosya);
      } catch {
        setHata(t.excelOkunamadi);
        return;
      }
      const res = await fetch("/api/admin/katilimcilar", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ csv }),
      });
      const veri = await res.json().catch(() => null);
      if (!res.ok) {
        setHata(veri?.hata ?? t.hataSunucu);
        return;
      }
      setMesaj(t.basarili(veri.eklenen));
      setDosyaAdi(null);
      if (dosyaRef.current) dosyaRef.current.value = "";
      router.refresh();
    } catch {
      setHata(t.hataSunucu);
    } finally {
      setYukleniyor(false);
    }
  }

  async function tumunuSil() {
    if (silOnay !== t.silOnayKelime || siliniyor) return;
    setSiliniyor(true);
    setMesaj(null);
    setHata(null);
    try {
      const res = await fetch("/api/admin/katilimcilar", { method: "DELETE" });
      const veri = await res.json().catch(() => null);
      if (!res.ok) {
        setHata(veri?.hata ?? t.hataSunucu);
        return;
      }
      setMesaj(t.silBasarili(veri.silinen));
      setSilOnay("");
      router.refresh();
    } catch {
      setHata(t.hataSunucu);
    } finally {
      setSiliniyor(false);
    }
  }

  const girisStil =
    "h-10 rounded-lg border border-royal-light/30 bg-midnight-soft px-3 text-sm text-slate-100 outline-none transition-colors placeholder:text-slate-500 focus:border-gold";

  return (
    <div className="space-y-6">
      {/* Manuel tek kişi ekleme — en sık kullanılan */}
      <section className="kart-3d rounded-2xl bg-midnight-card/60 p-6 shadow-xl ring-1 ring-gold/30 backdrop-blur">
        <h2 className="text-lg font-semibold text-gold-light">➕ {t.ekleBaslik}</h2>
        <p className="mt-1 text-sm text-slate-400">{t.ekleAciklama}</p>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input
            value={kisi.ad}
            onChange={(e) => setKisi({ ...kisi, ad: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && kisiEkle()}
            placeholder={t.alanAd}
            aria-label={t.alanAd}
            className={`${girisStil} sm:col-span-2`}
          />
          <input
            value={kisi.takim}
            onChange={(e) => setKisi({ ...kisi, takim: e.target.value })}
            placeholder={t.alanTakim}
            aria-label={t.alanTakim}
            className={girisStil}
          />
          <input
            value={kisi.sehir}
            onChange={(e) => setKisi({ ...kisi, sehir: e.target.value })}
            placeholder={t.alanSehir}
            aria-label={t.alanSehir}
            className={girisStil}
          />
          <input
            value={kisi.telefon}
            onChange={(e) => setKisi({ ...kisi, telefon: e.target.value })}
            placeholder={t.alanTelefon}
            aria-label={t.alanTelefon}
            className={girisStil}
          />
          <input
            value={kisi.eposta}
            onChange={(e) => setKisi({ ...kisi, eposta: e.target.value })}
            placeholder={t.alanEposta}
            aria-label={t.alanEposta}
            className={girisStil}
          />
        </div>

        <button
          onClick={kisiEkle}
          disabled={!kisi.ad.trim() || ekleniyor}
          className="mt-4 rounded-lg bg-gold px-5 py-2.5 text-sm font-semibold text-midnight transition-colors hover:bg-gold-light disabled:cursor-not-allowed disabled:opacity-40"
        >
          {ekleniyor ? t.ekleniyor : t.ekle}
        </button>

        {ekleMesaj && (
          <p className="mt-3 text-sm font-medium text-emerald-400">{ekleMesaj}</p>
        )}
        {ekleHata && (
          <p role="alert" className="mt-3 text-sm font-medium text-red-400">
            {ekleHata}
          </p>
        )}
      </section>

      {/* Dosyadan toplu içe aktarma — CSV veya Excel */}
      <section className="kart-3d rounded-2xl bg-midnight-card/60 p-6 shadow-xl ring-1 ring-royal/30 backdrop-blur">
        <h2 className="text-lg font-semibold text-gold-light">{t.importBaslik}</h2>
        <p className="mt-1 text-sm text-slate-400">{t.importAciklama}</p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className="cursor-pointer rounded-lg border border-royal-light/40 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-midnight-soft">
            {dosyaAdi ?? t.dosyaSec}
            <input
              ref={dosyaRef}
              type="file"
              accept=".csv,text/csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={(e) => {
                setDosyaAdi(e.target.files?.[0]?.name ?? null);
                setMesaj(null);
                setHata(null);
              }}
            />
          </label>
          <button
            onClick={iceAktar}
            disabled={!dosyaAdi || yukleniyor}
            className="rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-midnight transition-colors hover:bg-gold-light disabled:cursor-not-allowed disabled:opacity-40"
          >
            {yukleniyor ? t.iceAktariliyor : t.iceAktar}
          </button>
        </div>

        {mesaj && (
          <p className="mt-3 text-sm font-medium text-emerald-400">{mesaj}</p>
        )}
        {hata && (
          <p role="alert" className="mt-3 text-sm font-medium text-red-400">
            {hata}
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-red-500/30 bg-midnight-card/60 p-6 shadow-xl backdrop-blur">
        <h2 className="text-lg font-semibold text-red-400">{t.silBaslik}</h2>
        <p className="mt-1 text-sm text-slate-400">{t.silAciklama}</p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <input
            type="text"
            value={silOnay}
            onChange={(e) => setSilOnay(e.target.value)}
            placeholder={t.silOnayEtiket(t.silOnayKelime)}
            aria-label={t.silOnayEtiket(t.silOnayKelime)}
            className="h-10 rounded-lg border border-red-500/40 bg-midnight-soft px-3 text-sm text-slate-100 outline-none transition-colors placeholder:text-slate-500 focus:border-red-400"
          />
          <button
            onClick={tumunuSil}
            disabled={silOnay !== t.silOnayKelime || siliniyor}
            className="rounded-lg bg-red-500/80 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {siliniyor ? t.siliniyor : t.sil}
          </button>
        </div>
      </section>
    </div>
  );
}
