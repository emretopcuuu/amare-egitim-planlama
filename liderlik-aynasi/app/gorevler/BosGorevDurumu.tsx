"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { tr } from "@/lib/i18n/tr";
import { sesCal } from "@/lib/sesEfekti";
import AynaYuzu, { type AynaDurum } from "@/components/AynaYuzu";
import AynaLaf from "@/components/AynaLaf";
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
  aynaDurum = "sicak",
  gece = false,
  yolculukMetin = null,
}: {
  siradakiDk: number | null;
  // D9: sıradaki turun yaklaşık Istanbul saati ("HH:MM") — sunucu hesaplar.
  siradakiSaat?: string | null;
  fragmanIpucu?: string;
  // Faz 0 — AYNA karakteri: günün lafı (statik havuzdan, sunucu seçer).
  aynaLafi?: string | null;
  // Faz 2 — ilişki durumu: küs ise poz da laf da soğur (oyunlu küslük).
  aynaDurum?: "sicak" | "serin" | "kus";
  // Görsel paket #5 — gece kuşağı: AYNA uyur (uykuda pozu + uyku lafı).
  gece?: boolean;
  // [YOLCULUK #2] 90 günde görev sabah penceresinde düşer — dakika tahmini
  // yanlış olur. Sunucu doğru beklenti metnini verir; varsa onu kullan.
  yolculukMetin?: string | null;
}) {
  // Görsel paket #4 — dokununca tepki: kısa poz değişimi + SFX + arada laf balonu.
  const [tepkiPoz, setTepkiPoz] = useState<AynaDurum | null>(null);
  const [balon, setBalon] = useState<string | null>(null);
  const tepkiZamanlayici = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tiklamaSayac = useRef(0);

  function maskotaDokun() {
    if (gece) return; // uyuyan AYNA uyandırılmaz — o ayrı bir şaka
    tiklamaSayac.current += 1;
    const pozlar: AynaDurum[] = ["saskin", "gururlu", "etkilenmis"];
    setTepkiPoz(pozlar[tiklamaSayac.current % pozlar.length]);
    sesCal("kivilcim");
    // Her 2-3 dokunuşta bir laf balonu (sürekli konuşan maskot yorucu olur).
    if (tiklamaSayac.current % 3 === 1) {
      const laflar = t.tiklamaLaflari;
      setBalon(laflar[tiklamaSayac.current % laflar.length]);
    }
    if (tepkiZamanlayici.current) clearTimeout(tepkiZamanlayici.current);
    tepkiZamanlayici.current = setTimeout(() => {
      setTepkiPoz(null);
      setBalon(null);
    }, 2200);
  }
  const bekleme =
    yolculukMetin ??
    (siradakiDk == null || siradakiDk <= 0
      ? t.bosHerAn
      : siradakiSaat
        ? t.bosSiradakiSaat(siradakiSaat)
        : t.bosSiradaki(siradakiDk));

  return (
    <section className="kart-cam relative overflow-hidden rounded-3xl px-6 py-8 text-center">
      {/* Faz 1/2 + görsel paket #4/#5 — AYNA'nın yüzü: dokununca tepki verir,
          gece uyur, küs moddaysa somurtur. */}
      <div className="relative mx-auto mb-3 h-28 w-28">
        <button
          type="button"
          onClick={maskotaDokun}
          aria-label="AYNA'ya dokun"
          className="cursor-pointer"
        >
          <AynaYuzu
            durum={tepkiPoz ?? (gece ? "uykuda" : aynaDurum === "kus" ? "kus" : "notr")}
            boyut={112}
            sinif="mx-auto drop-shadow-[0_0_24px_rgba(212,175,55,0.25)]"
          />
        </button>
        {balon && (
          <AynaLaf
            metin={balon}
            kuyruk="alt"
            sinif="absolute -top-2 left-1/2 w-max -translate-x-1/2 -translate-y-full"
          />
        )}
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
