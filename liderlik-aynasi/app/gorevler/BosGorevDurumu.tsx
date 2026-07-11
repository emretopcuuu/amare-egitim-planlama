"use client";

import Link from "next/link";
import { tr } from "@/lib/i18n/tr";
import AynaYuzu from "@/components/AynaYuzu";
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
      {/* Faz 1 — AYNA'nın yüzü: soyut göz yerine maskotun kendisi. Nefes alma
          animasyonu (ayna-goz) korunur; günün lafı varsa poz da laconik uyum
          için nötr kalır. */}
      <div className="ayna-goz mx-auto mb-3 h-28 w-28">
        <AynaYuzu durum="notr" boyut={112} sinif="mx-auto drop-shadow-[0_0_24px_rgba(212,175,55,0.25)]" />
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
