"use client";

import { useState } from "react";
import { tr } from "@/lib/i18n/tr";
import GeriButonu from "@/components/GeriButonu";

const t = tr.red;

// Go-for-No: "Bir Hayır aldım" → veri kasasına düşer, Tecrübe Puanı artar,
// AYNA reti yeniden çerçeveler (Fun Failure). Kimliğe değmez — sadece sayar.
export default function ReddiKutla({ toplam, hafta }: { toplam: number; hafta: number }) {
  const [sayi, setSayi] = useState(toplam);
  const [haftaSayi, setHaftaSayi] = useState(hafta);
  const [acik, setAcik] = useState(false);
  const [aciklama, setAciklama] = useState("");
  const [reframe, setReframe] = useState<string | null>(null);
  const [mesgul, setMesgul] = useState(false);

  async function kaydet() {
    setMesgul(true);
    try {
      const res = await fetch("/api/red", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ aciklama: aciklama.trim() || undefined }),
      });
      const v = await res.json().catch(() => null);
      if (!res.ok || !v) return;
      setSayi(v.toplam ?? sayi + 1);
      setHaftaSayi(v.hafta ?? haftaSayi + 1);
      setReframe(v.reframe ?? null);
      setAcik(false);
      setAciklama("");
    } finally {
      setMesgul(false);
    }
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <div className="w-full max-w-md">
        <div className="text-left">
          <GeriButonu />
        </div>
        <p className="text-5xl" aria-hidden>
          🎯
        </p>
        <h1 className="prizma-serif ay-metin mt-3 text-2xl font-semibold">{t.baslik}</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">{t.aciklama}</p>

        {/* Sayaç */}
        <div className="kart-cam mt-6 rounded-3xl p-8">
          <p className="text-6xl font-bold text-gold">{sayi}</p>
          <p className="mt-1 text-sm uppercase tracking-widest text-slate-400">
            {t.toplamEtiket}
          </p>
          <p className="mt-2 text-xs text-slate-500">{t.haftaEtiket(haftaSayi)}</p>
        </div>

        {/* Reframe (son kayıttan sonra) */}
        {reframe && (
          <p className="kutlama-serit mt-4 rounded-2xl border border-gold/30 bg-gold/10 px-4 py-3 text-sm font-medium leading-relaxed text-gold-light">
            {reframe}
          </p>
        )}

        {/* Kayıt */}
        {acik ? (
          <div className="mt-6 space-y-3">
            <textarea
              value={aciklama}
              onChange={(e) => setAciklama(e.target.value)}
              rows={2}
              placeholder={t.aciklamaYer}
              className="w-full resize-none rounded-2xl border border-royal-light/30 bg-midnight-soft px-4 py-3 text-base text-slate-100 outline-none focus:border-gold"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setAcik(false)}
                className="h-12 flex-1 rounded-2xl border border-royal-light/40 text-sm font-semibold text-slate-300"
              >
                {t.vazgec}
              </button>
              <button
                onClick={() => void kaydet()}
                disabled={mesgul}
                className="btn-kor parilti h-12 flex-[2] rounded-2xl text-base font-bold disabled:opacity-50"
              >
                {mesgul ? t.kaydediliyor : t.kaydet}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => {
              setReframe(null);
              setAcik(true);
            }}
            className="btn-kor parilti mt-6 flex h-14 w-full items-center justify-center rounded-2xl text-lg font-bold"
          >
            {t.dugme}
          </button>
        )}
      </div>
    </main>
  );
}
