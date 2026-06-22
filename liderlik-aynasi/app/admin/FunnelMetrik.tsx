import type { FunnelOzet } from "@/lib/funnel";
import { tr } from "@/lib/i18n/tr";

const t = tr.admin.funnelMetrik;

// FUNNEL DÖNÜŞÜM PANOSU — kamp öncesi hunisinin gerçek hali. Her adım, toplama
// göre oransal bir çubuk; bir önceki adıma göre düşüş (kaç kişi kayboldu)
// kırmızıyla işaretlenir. Operatör darboğazı anında görür.
export default function FunnelMetrik({
  ozet,
  ciplak = false,
}: {
  ozet: FunnelOzet;
  // ciplak: "Genel Durum" kartı içinde kendi section çerçevesi olmadan render.
  ciplak?: boolean;
}) {
  const { toplam, adimlar } = ozet;
  if (toplam === 0) return null;

  const govde = (
    <>
      <h3 className="text-sm font-semibold uppercase tracking-wide text-gold-light">
        {t.baslik}
      </h3>
      <p className="mt-0.5 text-xs text-slate-400">{t.aciklama}</p>

      <ol className="mt-4 space-y-2.5">
        {adimlar.map((a) => {
          const oran = toplam > 0 ? Math.round((a.sayi / toplam) * 100) : 0;
          return (
            <li key={a.anahtar}>
              <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                <span className="flex items-center gap-1.5 text-slate-200">
                  <span aria-hidden>{a.ikon}</span>
                  {a.ad}
                </span>
                <span className="flex items-center gap-2">
                  {a.dususOnceki > 0 && (
                    <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[0.65rem] font-semibold text-red-300">
                      ↓ {a.dususOnceki} {t.kayip}
                    </span>
                  )}
                  <span className="font-semibold text-slate-100">
                    {a.sayi}
                    <span className="ml-1 text-xs font-normal text-slate-500">%{oran}</span>
                  </span>
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-royal-light to-gold transition-all duration-700"
                  style={{ width: `${oran}%` }}
                />
              </div>
            </li>
          );
        })}
      </ol>
    </>
  );
  if (ciplak) return govde;
  return (
    <section className="kart-3d rounded-2xl bg-midnight-card/60 p-5 ring-1 ring-royal/30">
      {govde}
    </section>
  );
}
