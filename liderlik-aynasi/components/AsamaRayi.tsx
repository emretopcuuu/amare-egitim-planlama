import { tr } from "@/lib/i18n/tr";

// AŞAMA RAYI — her çok-aşamalı akışta tutarlı "nerede olduğunu + sırada ne
// olduğunu" gösteren şerit. Salt görsel (sunucu/istemci her yerde çalışır);
// geri-dönüş düğmeleri her akışın kendi içinde. Kilitli aşama bile ADIYLA
// görünür ("şu an açık değil ama sırada bu var").
export type RayDurum = "tamam" | "simdi" | "siradaki" | "bekliyor" | "kilitli";
export type RayAsama = { ad: string; durum: RayDurum };

const t = tr.asama;

const NOKTA: Record<RayDurum, string> = {
  tamam: "bg-emerald-500 text-[#1a1206]",
  simdi: "bg-gold text-[#1a1206] ring-2 ring-gold/40",
  siradaki: "bg-gold/25 text-gold-light ring-1 ring-gold/40",
  bekliyor: "bg-midnight-soft text-slate-500",
  kilitli: "bg-midnight-soft text-slate-500",
};
const ETIKET: Record<RayDurum, string> = {
  tamam: "text-slate-400",
  simdi: "font-semibold text-gold-light",
  siradaki: "text-gold-light/80",
  bekliyor: "text-slate-500",
  kilitli: "text-slate-500",
};

export default function AsamaRayi({
  asamalar,
  className = "",
}: {
  asamalar: RayAsama[];
  className?: string;
}) {
  if (asamalar.length === 0) return null;
  const tamamSayi = asamalar.filter((a) => a.durum === "tamam").length;
  return (
    <nav
      aria-label={t.rayEtiket}
      className={`flex items-stretch gap-1 ${className}`}
    >
      {asamalar.map((a, i) => {
        const ilk = i === 0;
        return (
          <div key={`${a.ad}-${i}`} className="flex min-w-0 flex-1 flex-col items-center">
            <div className="flex w-full items-center">
              {/* sol bağlantı çizgisi */}
              <span
                className={`h-0.5 flex-1 ${ilk ? "opacity-0" : i <= tamamSayi ? "bg-emerald-500/50" : "bg-white/10"}`}
              />
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[0.7rem] font-bold ${NOKTA[a.durum]}`}
                aria-current={a.durum === "simdi" ? "step" : undefined}
              >
                {a.durum === "tamam" ? "✓" : a.durum === "kilitli" ? "🔒" : i + 1}
              </span>
              {/* sağ bağlantı çizgisi */}
              <span
                className={`h-0.5 flex-1 ${i === asamalar.length - 1 ? "opacity-0" : i < tamamSayi ? "bg-emerald-500/50" : "bg-white/10"}`}
              />
            </div>
            <span className={`mt-1 line-clamp-2 text-center text-[0.6rem] leading-tight ${ETIKET[a.durum]}`}>
              {a.ad}
            </span>
          </div>
        );
      })}
    </nav>
  );
}

// "Sıradaki: X" önizleme satırı — bir aşama biterken sıradakini, açık olmasa
// bile adıyla gösterir. Kilitliyse nazik bir "ne zaman açılır" notu eklenir.
export function SiradakiOnizleme({
  ad,
  kilitli = false,
  not,
  className = "",
}: {
  ad: string;
  kilitli?: boolean;
  not?: string;
  className?: string;
}) {
  return (
    <p className={`text-center text-xs text-slate-400 ${className}`}>
      <span className="font-semibold text-gold-light/80">{t.siradaki}</span>{" "}
      {ad}
      {kilitli && (
        <span className="ml-1 text-slate-500">🔒 {not ?? t.kilitliNot}</span>
      )}
    </p>
  );
}
