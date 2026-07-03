"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { tr } from "@/lib/i18n/tr";
import AynaIkon from "@/components/AynaIkon";

const t = tr.hazirlik;

// KUTSAL ALAN / HAZIRLIK — onboarding'in EN BAŞI. İki ADIM:
// (1) "giris": tonu kurar — yalnız, sakin, ~1 saat ayrılan, çok değerli bir
//     koçluk/mentorluk seansı gibi bir öz-yolculuk. Veri toplamaz, "Devam et".
// (2) "kvkk": KVKK güveni KENDİ SAYFASINDA, kocaman — "Cevaplarını kimse
//     görmeyecek. Admin dahil hiç kimse." İnsanlar "bunu kim okuyacak?"
//     çekincesiyle yüzeysel cevap veriyordu; güven mesajı ilk sayfanın uzun
//     metninde kaybolmasın diye ayrıldı. "Okudum, kabul ediyorum" düğmesinin
//     kendisi açık rızadır → /api/hazirlik consent_at'i yazar. Rıza yoksa
//     hiçbir veri toplayan adım açılmaz.
export default function HazirlikEkrani({ ad }: { ad: string }) {
  const router = useRouter();
  const [adim, setAdim] = useState<"giris" | "kvkk">("giris");
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [hata, setHata] = useState(false);

  async function kabulEt() {
    if (gonderiliyor) return;
    setGonderiliyor(true);
    setHata(false);
    try {
      const res = await fetch("/api/hazirlik", { method: "POST" });
      if (!res.ok) {
        setHata(true);
        return;
      }
      router.refresh();
    } catch {
      setHata(true);
    } finally {
      setGonderiliyor(false);
    }
  }

  const ilkAd = ad.split(" ")[0];

  // ADIM 2 — KVKK güven ekranı: tek konu, büyük tipografi.
  if (adim === "kvkk") {
    return (
      <main className="relative flex min-h-dvh flex-col overflow-y-auto bg-[#06121e]">
        <div className="sahne-giris mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-6 py-10">
          <div className="mb-6 flex justify-center">
            <span className="text-5xl" aria-hidden>
              🔒
            </span>
          </div>

          <p className="text-center text-xs font-semibold uppercase tracking-[0.4em] text-slate-500">
            {t.kvkk.ust}
          </p>
          <h1 className="prizma-serif ay-metin mt-3 text-center text-4xl font-bold leading-tight sm:text-5xl">
            {t.kvkk.baslikBuyuk}
          </h1>
          <p className="parilti mt-3 text-center text-2xl font-bold text-gold-light sm:text-3xl">
            {t.kvkk.baslikVurgu}
          </p>

          <div className="mt-8 space-y-3">
            {t.kvkk.maddeler.map((m) => (
              <div
                key={m.baslik}
                className="flex items-start gap-3 rounded-2xl border border-white/5 bg-white/[0.03] p-4"
              >
                <span className="text-2xl leading-none" aria-hidden>
                  {m.ikon}
                </span>
                <div>
                  <p className="text-base font-semibold text-slate-100">{m.baslik}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-slate-400">{m.metin}</p>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-6 rounded-2xl border border-gold/25 bg-gold/[0.06] px-4 py-3 text-center text-base leading-relaxed text-gold-light">
            {t.kvkk.davet}
          </p>

          <p className="mt-4 text-center text-sm text-slate-400">
            {t.kvkk.linkOn}
            <Link
              href="/gizlilik"
              className="font-semibold text-gold-light underline underline-offset-2"
            >
              {t.kvkk.link}
            </Link>
            {t.kvkk.linkSon}
          </p>

          {hata && (
            <p role="alert" className="mt-3 text-center text-sm font-medium text-amber-300">
              {t.hata}
            </p>
          )}

          <button
            onClick={kabulEt}
            disabled={gonderiliyor}
            className="btn-kor parilti mt-6 flex h-14 w-full items-center justify-center rounded-2xl text-lg font-bold transition-opacity disabled:opacity-40"
          >
            {gonderiliyor ? t.basliyor : t.kvkk.kabul}
          </button>
          <p className="mt-3 text-center text-xs text-slate-500">{t.dipnot}</p>

          <button
            onClick={() => setAdim("giris")}
            className="mt-4 text-center text-sm text-slate-400 hover:text-slate-200"
          >
            {t.kvkk.geri}
          </button>
        </div>
      </main>
    );
  }

  // ADIM 1 — kutsal alan / ton kurma. Veri toplamaz; sadece ilerler.
  return (
    <main className="relative flex min-h-dvh flex-col overflow-y-auto bg-[#06121e]">
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-6 py-10">
        {/* Marka anı — sakin, kutsal açılış */}
        <div className="mb-6 flex justify-center">
          <AynaIkon className="h-16 w-16 text-gold" />
        </div>

        <p className="text-center text-xs font-semibold uppercase tracking-[0.4em] text-slate-500">
          {t.ust}
        </p>
        <h1 className="prizma-serif ay-metin mt-3 text-center text-3xl font-bold leading-tight sm:text-4xl">
          {t.baslik(ilkAd)}
        </h1>

        <div className="mt-6 space-y-4 text-lg leading-relaxed text-slate-300">
          <p>{t.giris}</p>
          <p className="rounded-2xl border border-gold/25 bg-gold/[0.06] px-4 py-3 text-base text-gold-light">
            {t.deger}
          </p>
        </div>

        {/* Hazırlık koşulları — tonu somutlaştırır */}
        <div className="mt-6 space-y-3">
          {t.kosullar.map((k) => (
            <div key={k.baslik} className="flex items-start gap-3 rounded-2xl bg-white/[0.03] p-4">
              <span className="text-2xl leading-none" aria-hidden>
                {k.ikon}
              </span>
              <div>
                <p className="font-semibold text-slate-100">{k.baslik}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-slate-400">{k.metin}</p>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => setAdim("kvkk")}
          className="btn-kor parilti mt-8 flex h-14 w-full items-center justify-center rounded-2xl text-lg font-bold"
        >
          {t.devamDugme}
        </button>
      </div>
    </main>
  );
}
