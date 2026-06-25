"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  HERKES_OYUNU,
  SECMELI_OYUNLAR,
  SECILECEK_ADET,
  OYUN_BILGI,
  type CmtTur,
} from "@/lib/cumartesiProgrami";

// Kişi Bowling dışındaki 3 oyundan 2'sini seçer; onaylayınca /api/oyun-secimi
// uygun gruba atar. Tam 2 seçilmeden onay açılmaz.
export default function OyunSecici() {
  const router = useRouter();
  const [secili, setSecili] = useState<CmtTur[]>([]);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  function toggle(o: CmtTur) {
    setHata(null);
    setSecili((s) =>
      s.includes(o)
        ? s.filter((x) => x !== o)
        : s.length >= SECILECEK_ADET
          ? s
          : [...s, o]
    );
  }

  async function gonder() {
    if (secili.length !== SECILECEK_ADET) return;
    setYukleniyor(true);
    setHata(null);
    try {
      const r = await fetch("/api/oyun-secimi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oyunlar: secili }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) {
        setHata(d?.hata ?? "Bir şey ters gitti. Tekrar dene.");
        return;
      }
      router.replace("/");
      router.refresh();
    } catch {
      setHata("Bağlantı hatası. Tekrar dene.");
    } finally {
      setYukleniyor(false);
    }
  }

  const bowling = OYUN_BILGI[HERKES_OYUNU];

  return (
    <div className="sahne-giris space-y-5">
      <header className="text-center">
        <p className="text-5xl" aria-hidden>
          🎲
        </p>
        <h1 className="prizma-serif ay-metin mt-3 text-2xl font-semibold">Oyununu Seç</h1>
      </header>

      {/* Kural kartı — mobil için büyük, net, madde madde */}
      <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 space-y-3">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 text-xl" aria-hidden>🎳</span>
          <p className="text-base font-semibold leading-snug text-gold-light">
            Bowling&apos;i herkes oynayacak — zorunlu.
          </p>
        </div>
        <div className="flex items-start gap-3">
          <span className="mt-0.5 text-xl" aria-hidden>✌️</span>
          <p className="text-base font-semibold leading-snug text-slate-100">
            Geri kalan <span className="text-gold-light">3 oyundan 2&apos;sini</span> sen seç.
          </p>
        </div>
        <div className="flex items-start gap-3">
          <span className="mt-0.5 text-xl" aria-hidden>👥</span>
          <p className="text-base leading-snug text-slate-300">
            Seçimine göre Cumartesi programın ve grubun belirlenecek.
          </p>
        </div>
      </div>

      {/* Bowling — sabit, herkes oynar */}
      <div className="kart-cam rounded-2xl p-4 ring-1 ring-gold/30">
        <div className="flex items-center gap-3">
          <span className="text-3xl" aria-hidden>
            {bowling.simge}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-slate-100">{bowling.ad}</p>
            <p className="text-sm text-slate-400">{bowling.aciklama}</p>
          </div>
          <span className="shrink-0 rounded-full bg-gold/20 px-2 py-0.5 text-[0.65rem] font-bold text-gold-light">
            HERKES
          </span>
        </div>
      </div>

      {/* Seçmeli 3 oyun — tam 2 seç */}
      <div className="space-y-3">
        {SECMELI_OYUNLAR.map((o) => {
          const bilgi = OYUN_BILGI[o];
          const sec = secili.includes(o);
          return (
            <button
              key={o}
              type="button"
              onClick={() => toggle(o)}
              aria-pressed={sec}
              className={`kart-cam flex w-full items-center gap-3 rounded-2xl p-4 text-left transition-all ${
                sec
                  ? "ring-2 ring-gold shadow-[0_0_0_4px_rgba(212,175,55,0.12)]"
                  : "ring-1 ring-royal/30 hover:ring-royal/60"
              }`}
            >
              <span className="text-3xl" aria-hidden>
                {bilgi.simge}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-100">{bilgi.ad}</p>
                <p className="text-sm text-slate-400">{bilgi.aciklama}</p>
              </div>
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                  sec ? "bg-gold text-[#1a1206]" : "bg-white/5 text-slate-500"
                }`}
                aria-hidden
              >
                {sec ? "✓" : ""}
              </span>
            </button>
          );
        })}
      </div>

      <p className="text-center text-sm font-medium text-slate-400">
        {secili.length}/{SECILECEK_ADET} seçildi
        {secili.length === SECILECEK_ADET && (
          <span className="ml-2 text-gold-light">✓ Hazır!</span>
        )}
      </p>
      {hata && <p className="text-center text-sm text-red-300">{hata}</p>}

      <button
        type="button"
        onClick={gonder}
        disabled={secili.length !== SECILECEK_ADET || yukleniyor}
        className="btn-kor flex h-14 w-full items-center justify-center rounded-2xl text-lg font-bold transition-transform hover:scale-[1.01] disabled:opacity-40"
      >
        {yukleniyor ? "Grubun belirleniyor…" : "Seçimi Onayla"}
      </button>
      <p className="text-center text-xs text-slate-500">
        Onayladığında oyunlarına uygun bir gruba yerleştirileceksin.{" "}
        <span className="font-semibold text-slate-400">Bu seçim sonradan değiştirilemez.</span>
      </p>
    </div>
  );
}
