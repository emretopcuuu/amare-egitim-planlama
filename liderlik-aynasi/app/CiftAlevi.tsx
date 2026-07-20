import type { CiftDurum } from "@/lib/ciftSerisi";

// G4 — çift serisi alevi (ana sayfa). Sunucu bileşeni; alev CSS ile yanar
// (reduced-motion'da sabit). Kül modunda gri; besleme tamamsa parlak.
export default function CiftAlevi({ durum }: { durum: CiftDurum }) {
  const { gunSayisi, kul, bugunTam, partnerAdlari, benBesledim, eksikVar } = durum;
  if (gunSayisi === 0 && !eksikVar && !bugunTam) {
    // Henüz seri yok — nazik davet.
    return (
      <div className="mt-3 rounded-2xl border border-royal/25 bg-midnight-card/40 p-3.5 text-center">
        <p className="text-sm text-slate-300">
          🔥 {partnerAdlari.join(" ve ")} ile ortak serin — <span className="text-gold-light">bugün ikiniz de bir adım atın</span>, seriyi başlatın.
        </p>
      </div>
    );
  }

  const boyut = gunSayisi >= 14 ? "text-4xl" : gunSayisi >= 7 ? "text-3xl" : "text-2xl";
  const durumMetin = bugunTam
    ? "bugün ikiniz de bir adım attınız 🎉"
    : kul
      ? "seri düştü — 3 gün üst üste adım atın, seriniz yeniden canlansın"
      : eksikVar
        ? benBesledim
          ? `${partnerAdlari.join(" ve ")} bekleniyor`
          : "senin adımın eksik — seriyi kaçırma"
        : "bugün ikiniz de bir adım atın";

  return (
    <div
      className={`mt-3 flex items-center gap-3 rounded-2xl border p-3.5 ${
        kul ? "border-slate-600/40 bg-slate-700/10" : "border-gold/40 bg-gradient-to-r from-gold/[0.1] to-transparent"
      }`}
    >
      <span className={`${boyut} ${kul ? "opacity-40 grayscale" : "alev-yan"}`} aria-hidden>
        {kul ? "🌑" : "🔥"}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-bold text-slate-100">
          {gunSayisi} günlük ortak seri
          <span className="ml-1 font-normal text-slate-400">· {partnerAdlari.join(" & ")}</span>
        </p>
        <p className={`text-xs ${kul ? "text-slate-500" : "text-gold-light/80"}`}>{durumMetin}</p>
      </div>
    </div>
  );
}
