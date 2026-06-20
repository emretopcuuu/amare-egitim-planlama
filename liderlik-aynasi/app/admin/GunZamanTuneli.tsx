import { tr } from "@/lib/i18n/tr";
import Ipucu from "./Ipucu";

const t = tr.admin.zamanTuneli;

// #6 Kamp zaman tüneli: "şu an neredeyiz" — hazırlık → 3 gün → kapanış → saha.
// aktifIndex panelde hesaplanır (açık dalga / rapor / tarih).
export default function GunZamanTuneli({ aktifIndex }: { aktifIndex: number }) {
  const adimlar = [t.hazirlik, t.gun1, t.gun2, t.gun3, t.kapanis, t.saha];
  return (
    <section className="rounded-2xl bg-midnight-card/40 p-4 ring-1 ring-royal/20">
      <div className="mb-2 flex items-center gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          {t.baslik}
        </p>
        <Ipucu {...tr.admin.yardim.zamanTuneli} />
      </div>
      <ol className="flex items-stretch">
        {adimlar.map((ad, i) => {
          const gecti = i < aktifIndex;
          const simdi = i === aktifIndex;
          return (
            <li key={ad} className="flex flex-1 flex-col items-center">
              <div className="flex w-full items-center">
                <span
                  className={`h-0.5 flex-1 ${
                    i === 0 ? "opacity-0" : gecti || simdi ? "bg-gold/60" : "bg-white/10"
                  }`}
                />
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    simdi
                      ? "parilti bg-gold text-[#1a1206] ring-2 ring-gold/50"
                      : gecti
                        ? "bg-emerald-500/30 text-emerald-300"
                        : "bg-white/10 text-slate-500"
                  }`}
                >
                  {gecti ? "✓" : i + 1}
                </span>
                <span
                  className={`h-0.5 flex-1 ${
                    i === adimlar.length - 1 ? "opacity-0" : gecti ? "bg-gold/60" : "bg-white/10"
                  }`}
                />
              </div>
              <span
                className={`mt-1.5 text-center text-[0.6rem] leading-tight ${
                  simdi
                    ? "font-bold text-gold-light"
                    : gecti
                      ? "text-slate-300"
                      : "text-slate-500"
                }`}
              >
                {ad}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
