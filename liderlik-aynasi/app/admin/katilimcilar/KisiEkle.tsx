"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { tr } from "@/lib/i18n/tr";

const t = tr.admin.katilimcilar;
const BOS_KISI = { ad: "", takim: "", sehir: "", telefon: "", eposta: "" };

// Manuel tek kişi ekleme formu (sayfanın en üstünde).
export default function KisiEkle() {
  const router = useRouter();
  const [kisi, setKisi] = useState({ ...BOS_KISI });
  const [ekleniyor, setEkleniyor] = useState(false);
  const [mesaj, setMesaj] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  async function ekle() {
    if (!kisi.ad.trim() || ekleniyor) return;
    setEkleniyor(true);
    setMesaj(null);
    setHata(null);
    try {
      const res = await fetch("/api/admin/katilimcilar", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(kisi),
      });
      const veri = await res.json().catch(() => null);
      if (!res.ok) {
        setHata(veri?.hata ?? t.hataSunucu);
        return;
      }
      setMesaj(t.ekleBasarili(veri.ad, veri.kod));
      setKisi({ ...BOS_KISI });
      router.refresh();
    } catch {
      setHata(t.hataSunucu);
    } finally {
      setEkleniyor(false);
    }
  }

  const girisStil =
    "h-10 rounded-lg border border-royal-light/30 bg-midnight-soft px-3 text-sm text-slate-100 outline-none transition-colors placeholder:text-slate-500 focus:border-gold";

  return (
    <section className="kart-3d rounded-2xl bg-midnight-card/60 p-6 shadow-xl ring-1 ring-gold/30 backdrop-blur">
      <h2 className="text-lg font-semibold text-gold-light">➕ {t.ekleBaslik}</h2>
      <p className="mt-1 text-sm text-slate-400">{t.ekleAciklama}</p>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input
          value={kisi.ad}
          onChange={(e) => setKisi({ ...kisi, ad: e.target.value })}
          onKeyDown={(e) => e.key === "Enter" && ekle()}
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
        onClick={ekle}
        disabled={!kisi.ad.trim() || ekleniyor}
        className="mt-4 rounded-lg bg-gold px-5 py-2.5 text-sm font-semibold text-midnight transition-colors hover:bg-gold-light disabled:cursor-not-allowed disabled:opacity-40"
      >
        {ekleniyor ? t.ekleniyor : t.ekle}
      </button>

      {mesaj && <p className="mt-3 text-sm font-medium text-emerald-400">{mesaj}</p>}
      {hata && (
        <p role="alert" className="mt-3 text-sm font-medium text-red-400">
          {hata}
        </p>
      )}
    </section>
  );
}
