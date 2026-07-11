"use client";

import Link from "next/link";
import { tr } from "@/lib/i18n/tr";
import EkstraGorev from "./EkstraGorev";

const t = tr.gorevler;

// UX #1/#8/#9/#10: "Şu an görevin yok" pasif ekranı yerine YAŞAYAN boş durum:
// nefes alan AYNA gözü + sıradaki görev tahmini + merak tohumu + tek net
// birincil eylem (Ayna Koçu). Ekstra görev ikincil kalır (#5).
// D9 — fragman sahnesi: dakika yerine somut saat çıpası ("~14:35 civarı") +
// kilitli 🔒 ipucu + tek cümlelik "hazırlan" önerisi.
export default function BosGorevDurumu({
  siradakiDk,
  siradakiSaat,
  fragmanIpucu,
  aynaLafi,
}: {
  siradakiDk: number | null;
  // D9: sıradaki turun yaklaşık Istanbul saati ("HH:MM") — sunucu hesaplar.
  siradakiSaat?: string | null;
  fragmanIpucu?: string;
  // Faz 0 — AYNA karakteri: günün lafı (statik havuzdan, sunucu seçer).
  aynaLafi?: string | null;
}) {
  const bekleme =
    siradakiDk == null || siradakiDk <= 0
      ? t.bosHerAn
      : siradakiSaat
        ? t.bosSiradakiSaat(siradakiSaat)
        : t.bosSiradaki(siradakiDk);

  return (
    <section className="kart-cam relative overflow-hidden rounded-3xl px-6 py-8 text-center">
      {/* Yaşayan AYNA gözü — nefes alır, iris döner (marka tutarlılığı) */}
      <div className="mx-auto mb-3 h-24 w-24">
        <div className="ayna-goz relative h-24 w-24 rounded-full">
          <span
            className="absolute inset-0 rounded-full"
            style={{
              background:
                "radial-gradient(circle, transparent 28%, rgba(212,175,55,0.5) 46%, rgba(78,124,166,0.42) 62%, transparent 75%)",
            }}
            aria-hidden
          />
          <span
            className="ayna-goz-iris absolute inset-[16%] rounded-full"
            style={{
              background:
                "conic-gradient(from 0deg, rgba(212,175,55,0.32), transparent 12%, rgba(78,124,166,0.32) 24%, transparent 36%, rgba(212,175,55,0.32) 48%, transparent 60%, rgba(78,124,166,0.32) 72%, transparent 84%, rgba(212,175,55,0.32) 96%, transparent)",
            }}
            aria-hidden
          />
          <span className="absolute inset-[38%] rounded-full bg-[#01060c] shadow-[inset_0_0_28px_rgba(0,0,0,0.85)]" aria-hidden />
          <span className="absolute left-[42%] top-[40%] h-[7%] w-[7%] rounded-full bg-white/70 blur-[1px]" aria-hidden />
        </div>
      </div>

      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold-light/70">
        {t.bosIzliyor}
      </p>
      <h2 className="prizma-serif ay-metin mt-1 text-2xl font-semibold">{t.aktifYokBaslik}</h2>
      <p className="mt-2 text-base leading-relaxed text-slate-300">{bekleme}</p>
      <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-slate-500">
        <span className="ekran-canli-nokta inline-block h-1.5 w-1.5 rounded-full bg-gold/70" aria-hidden />
        {t.bosMerak}
      </p>

      {/* Faz 0 — AYNA'nın günün lafı: karakter boş anda da yaşar */}
      {aynaLafi && (
        <p className="mx-auto mt-4 max-w-sm text-sm italic leading-relaxed text-gold-light/80">
          “{aynaLafi}”
        </p>
      )}

      {/* FAZ 5.1 + D9 — GÖREV FRAGMANI: kilitli kart, gerçek içeriği asla açık
          etmez + tek cümlelik "hazırlan" önerisi */}
      {fragmanIpucu && (
        <div className="mx-auto mt-4 w-full max-w-sm rounded-2xl border border-white/10 bg-white/[0.03] p-3">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">{t.fragmanBaslik}</p>
          <p className="mt-1 text-sm text-slate-300">🔒 İpucu: {fragmanIpucu}</p>
          <p className="mt-1.5 text-xs text-slate-500">{t.bosHazirlan}</p>
        </div>
      )}

      <div className="mx-auto mt-6 grid w-full max-w-sm gap-2.5">
        {/* UX #10: boşken en değerli birincil eylem = Ayna Koçu */}
        <Link
          href="/kocu"
          className="btn-kor flex h-12 items-center justify-center gap-2 rounded-xl text-base font-bold"
        >
          👁 {t.bosKocu}
        </Link>
        {/* UX #5: ekstra görev ikincil + "tempo" notu */}
        <EkstraGorev ikincil />
        <p className="-mt-1 text-xs text-slate-500">{t.ekstraNot}</p>
        <Link
          href="/takdir"
          className="flex h-11 items-center justify-center rounded-xl border border-royal-light/30 text-sm font-medium text-slate-200 transition-colors hover:bg-white/5"
        >
          💛 {t.bosTakdir}
        </Link>
      </div>
    </section>
  );
}
