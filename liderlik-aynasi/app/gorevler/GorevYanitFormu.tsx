"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { tr } from "@/lib/i18n/tr";
import MikrofonButonu from "@/components/MikrofonButonu";

const t = tr.gorevler;

type Sonuc = {
  puan?: number;
  yorum?: string;
  kivilcim?: number;
  toplam?: number;
  unvan?: string;
  soz?: boolean;
  bekliyor?: boolean;
};

// Görev yanıtı: gönderim AYNA'nın anlık puanını bekler (5-15 sn) —
// "canlı yapay zekâ" hissinin kalbi bu bekleyiştir.
export default function GorevYanitFormu({ gorevId }: { gorevId: string }) {
  const router = useRouter();
  const [yanit, setYanit] = useState("");
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [sonuc, setSonuc] = useState<Sonuc | null>(null);
  const [hata, setHata] = useState(false);

  async function gonder(e: React.FormEvent) {
    e.preventDefault();
    if (gonderiliyor || yanit.trim().length < 2) return;
    setGonderiliyor(true);
    setHata(false);
    try {
      const res = await fetch("/api/gorev-yanit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ gorevId, yanit }),
      });
      const veri = await res.json().catch(() => null);
      if (res.status === 202) {
        setSonuc({ bekliyor: true });
        return;
      }
      if (!res.ok) {
        setHata(true);
        return;
      }
      setSonuc(veri);
    } catch {
      setHata(true);
    } finally {
      setGonderiliyor(false);
    }
  }

  if (sonuc) {
    return (
      <div className="mt-4 rounded-xl bg-midnight-soft p-4 text-center">
        {sonuc.bekliyor ? (
          <p className="text-sm text-slate-300">{t.durumlar.submitted}…</p>
        ) : (
          <>
            {sonuc.puan !== undefined && (
              <p className="text-2xl font-bold text-gold">{t.puanin(sonuc.puan)}</p>
            )}
            {sonuc.kivilcim !== undefined && (
              <p className="mt-1 font-semibold text-gold-light">
                {t.kivilcimKazandin(sonuc.kivilcim)}
              </p>
            )}
            {sonuc.yorum && (
              <p className="mt-3 text-sm italic text-slate-200">“{sonuc.yorum}”</p>
            )}
            {sonuc.toplam !== undefined && sonuc.unvan && (
              <p className="mt-3 text-xs text-slate-400">
                {tr.kivilcim.toplam(sonuc.toplam)} · {tr.kivilcim.unvanin}:{" "}
                {sonuc.unvan}
              </p>
            )}
          </>
        )}
        <button
          onClick={() => router.refresh()}
          className="mt-4 text-xs text-royal-light underline-offset-4 hover:underline"
        >
          {tr.degerlendir.devamEt} →
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={gonder} className="mt-4">
      <label htmlFor={`yanit-${gorevId}`} className="text-xs font-medium text-slate-300">
        {t.yanitEtiket}
      </label>
      <textarea
        id={`yanit-${gorevId}`}
        value={yanit}
        onChange={(e) => setYanit(e.target.value)}
        rows={3}
        maxLength={1500}
        disabled={gonderiliyor}
        placeholder={t.yanitPlaceholder}
        className="mt-1 w-full rounded-xl border border-royal-light/30 bg-midnight-soft p-3 text-base text-slate-100 outline-none transition-colors placeholder:text-slate-500 focus:border-gold"
      />
      {hata && (
        <p role="alert" className="mt-1 text-sm font-medium text-red-400">
          {t.hata}
        </p>
      )}
      <div className="mt-2 flex gap-2">
        <MikrofonButonu
          disabled={gonderiliyor}
          onMetin={(parca) =>
            setYanit((y) => (y.trim() ? `${y.trim()} ${parca}` : parca))
          }
        />
        <button
          type="submit"
          disabled={yanit.trim().length < 2 || gonderiliyor}
          className="h-11 flex-1 rounded-xl bg-gold font-semibold text-midnight transition-colors hover:bg-gold-light disabled:cursor-not-allowed disabled:opacity-40"
        >
          {gonderiliyor ? t.gonderiliyor : t.gonder}
        </button>
      </div>
    </form>
  );
}
