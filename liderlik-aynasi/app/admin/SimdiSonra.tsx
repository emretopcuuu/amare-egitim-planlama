// UX #4 — "Şimdi / Sırada / Sonra" şeridi. Aşama omurgası "neredeyiz"i gösterir;
// bu şerit somut olarak şu an ne yapılacağını, bittiğinde ne açılacağını ve
// sonra ne geleceğini sade dille söyler. Saf sunucu bileşeni (aktifAsama'ya bağlı).
const ADIMLAR: { simdi: string; sonra: string }[] = [
  // 1 · Hazırlık
  {
    simdi: "Katılımcıları yükle, gruplara dağıt ve QR kodlarını bas.",
    sonra: "Hazırlık bitince Katılım aşaması açılır (Pusula).",
  },
  // 2 · Katılım
  {
    simdi: "Katılımcılar kamp öncesi Pusula'yı doldursun; eksik kalanları dürt.",
    sonra: "Kamp günü gelince oda QR'ı ile mührü açar, Canlı aşamaya geçersin.",
  },
  // 3 · Kamp Canlı
  {
    simdi: "Değerlendirme turlarını (Dalga) sırayla aç-kapat; günün akışını izle.",
    sonra: "Son gün Final: raporları (Ayna Anı) açarsın.",
  },
  // 4 · Final
  {
    simdi: "Ayna Anı'nı (raporları) aç ve kapanış sözünü topla.",
    sonra: "Kamp sonrası 90 günlük takip başlar.",
  },
  // 5 · Sonrası
  {
    simdi: "90 günlük yolculuğu izle; özlü söz ve görevler otomatik akar.",
    sonra: "Bu kamp tamamlandı — yeni kamp için baştan kurabilirsin.",
  },
];

const ASAMA_AD = ["Hazırlık", "Katılım", "Kamp Canlı", "Final", "Sonrası"];

export default function SimdiSonra({ aktifAsama = 1 }: { aktifAsama?: number }) {
  const i = Math.min(Math.max(aktifAsama - 1, 0), ADIMLAR.length - 1);
  const adim = ADIMLAR[i];
  const sonrakiAd = ASAMA_AD[i + 1] ?? null;

  return (
    <section className="rounded-2xl border border-royal-light/25 bg-white/[0.02] p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-gold/[0.06] p-3 ring-1 ring-gold/25">
          <p className="text-[0.65rem] font-bold uppercase tracking-wide text-gold-light">
            ▶ Şimdi · {ASAMA_AD[i]}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-slate-200">{adim.simdi}</p>
        </div>
        <div className="rounded-xl bg-white/[0.02] p-3 ring-1 ring-royal/20">
          <p className="text-[0.65rem] font-bold uppercase tracking-wide text-slate-400">
            ⏭ Sonra{sonrakiAd ? ` · ${sonrakiAd}` : ""}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-slate-400">{adim.sonra}</p>
        </div>
      </div>
    </section>
  );
}
