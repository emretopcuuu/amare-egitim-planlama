"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { tr } from "@/lib/i18n/tr";
import { tost } from "@/lib/tost";

const t = tr.admin.eslestirme;

export default function EslestirmeFormu() {
  const router = useRouter();
  const [grupIci, setGrupIci] = useState(5);
  const [grupDisi, setGrupDisi] = useState(3);
  const [onay, setOnay] = useState(false);
  const [mesaj, setMesaj] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [calisiyor, setCalisiyor] = useState(false);
  const [ekleniyor, setEkleniyor] = useState(false);
  const [sifirlaOnay, setSifirlaOnay] = useState(false);
  const [sifirlayor, setSifirlayor] = useState(false);

  async function calistir(e: React.FormEvent) {
    e.preventDefault();
    if (!onay || calisiyor) return;
    setCalisiyor(true);
    setMesaj(null);
    setHata(null);
    try {
      const res = await fetch("/api/admin/eslestirme", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ grupIci, grupDisi }),
      });
      const veri = await res.json().catch(() => null);
      if (!res.ok) {
        setHata(veri?.hata ?? t.hataSunucu);
        return;
      }
      setMesaj(t.basarili(veri.atamaSayisi));
      setOnay(false);
      router.refresh();
    } catch {
      setHata(t.hataSunucu);
    } finally {
      setCalisiyor(false);
    }
  }

  async function ekle() {
    if (ekleniyor || grupIci + grupDisi < 1) return;
    setEkleniyor(true);
    try {
      const res = await fetch("/api/admin/eslestirme-ekle", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ grupIci, grupDisi }),
      });
      const veri = await res.json().catch(() => null);
      if (!res.ok) {
        tost(veri?.hata ?? t.hataSunucu, "hata");
        return;
      }
      const n: number = veri.atamaSayisi ?? 0;
      tost(n > 0 ? t.ekleBasarili(n) : (veri.mesaj ?? t.ekleYeniYok), "basari");
      router.refresh();
    } catch {
      tost(t.hataSunucu, "hata");
    } finally {
      setEkleniyor(false);
    }
  }

  const sayiSinif =
    "h-10 w-20 rounded-lg border border-royal-light/30 bg-midnight-soft px-3 text-center text-slate-100 outline-none transition-colors focus:border-gold";

  return (
    <form
      onSubmit={calistir}
      className="kart-3d rounded-2xl bg-midnight-card/60 p-6 shadow-xl ring-1 ring-royal/30 backdrop-blur"
    >
      <p className="text-sm text-slate-400">{t.aciklama}</p>

      <div className="mt-4 flex flex-wrap items-end gap-4">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-300">
            🤝 {t.grupIciEtiket}
          </span>
          <input
            type="number"
            min={0}
            max={15}
            value={grupIci}
            onChange={(e) => setGrupIci(Number(e.target.value))}
            className={sayiSinif}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-300">
            🌍 {t.grupDisiEtiket}
          </span>
          <input
            type="number"
            min={0}
            max={15}
            value={grupDisi}
            onChange={(e) => setGrupDisi(Number(e.target.value))}
            className={sayiSinif}
          />
        </label>
      </div>

      {/* Artımlı tamamlama — mevcut atamalara dokunmaz */}
      <div className="mt-4 rounded-xl border border-royal/20 bg-midnight-soft/30 p-3">
        <p className="text-xs text-slate-400">{t.ekleAciklama}</p>
        <button
          type="button"
          onClick={() => void ekle()}
          disabled={ekleniyor || grupIci + grupDisi < 1}
          className="mt-2 rounded-lg border border-royal-light/40 px-4 py-2 text-sm font-semibold text-slate-200 transition-colors hover:bg-midnight-soft disabled:opacity-40"
        >
          {ekleniyor ? t.ekleniyor : `➕ ${t.ekle}`}
        </button>
      </div>

      {/* Tam yeniden eşleştirme */}
      <p className="mt-5 text-xs font-medium text-amber-400">⚠️ {t.uyari}</p>
      <label className="mt-2 flex items-center gap-2 text-sm text-slate-300">
        <input
          type="checkbox"
          checked={onay}
          onChange={(e) => setOnay(e.target.checked)}
          className="h-4 w-4 accent-gold"
        />
        {t.onayEtiket}
      </label>

      {mesaj && (
        <p className="mt-3 text-sm font-medium text-emerald-400">{mesaj}</p>
      )}
      {hata && (
        <p role="alert" className="mt-3 text-sm font-medium text-red-400">
          {hata}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={!onay || calisiyor || grupIci + grupDisi < 1}
          className="rounded-lg bg-gold px-5 py-2.5 text-sm font-semibold text-[#1a1206] transition-colors hover:bg-gold-light disabled:cursor-not-allowed disabled:opacity-40"
        >
          {calisiyor ? t.calisiyor : t.calistir}
        </button>

        {/* Sıfırla — atamaları sil, yeniden oluşturma */}
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer">
            <input
              type="checkbox"
              checked={sifirlaOnay}
              onChange={(e) => setSifirlaOnay(e.target.checked)}
              className="h-3.5 w-3.5 accent-red-400"
            />
            {t.sifirlaOnay}
          </label>
          <button
            type="button"
            onClick={async () => {
              if (!sifirlaOnay || sifirlayor) return;
              setSifirlayor(true);
              try {
                const res = await fetch("/api/admin/eslestirme", { method: "DELETE" });
                const v = await res.json().catch(() => null);
                if (!res.ok) { tost(v?.hata ?? t.hataSunucu, "hata"); return; }
                tost(t.sifirlaBasarili, "basari");
                setSifirlaOnay(false);
                router.refresh();
              } catch { tost(t.hataSunucu, "hata"); }
              finally { setSifirlayor(false); }
            }}
            disabled={!sifirlaOnay || sifirlayor}
            className="rounded-lg border border-red-500/40 px-3 py-2 text-xs font-semibold text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-40"
          >
            {sifirlayor ? t.sifirlaCalisiyor : `🗑 ${t.sifirla}`}
          </button>
        </div>
      </div>
    </form>
  );
}
