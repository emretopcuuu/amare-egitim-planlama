import { tr } from "@/lib/i18n/tr";
import type { OyunPlani, PlanMadde } from "@/lib/oyunPlani";

const t = tr.oyunPlani;

// FAZ 1: Oyun planı artık RAPORDA otomatik üretilmez. Plan, kapanışta kişinin
// KENDİ kurduğu şeydir (Plan Atölyesi /oyun-planim). Bu bölüm yalnız bir çapadır:
// plan henüz yoksa "kapanışta birlikte kuracağız" der; kişi onayladıysa özetini
// salt-okunur gösterir. Sahne koreografisini bozmamak için buradan atlama linki YOK.
export default function OyunPlaniBolumu({ mevcutPlan }: { mevcutPlan: OyunPlani | null }) {
  const onayli = mevcutPlan?.durum === "onaylandi";
  const ufuklar: { etiket: string; maddeler: PlanMadde[] }[] = onayli
    ? [
        { etiket: "İlk 72 saat", maddeler: mevcutPlan!.ilk_72_saat },
        { etiket: t.onGun, maddeler: mevcutPlan!.on_gun },
        { etiket: t.kirkGun, maddeler: mevcutPlan!.kirk_gun },
        { etiket: t.doksanGun, maddeler: mevcutPlan!.doksan_gun },
      ].filter((u) => u.maddeler.length > 0)
    : [];

  return (
    <section className="kart-cerceve rounded-2xl bg-gradient-to-br from-emerald-500/15 to-midnight-card/60 p-5 shadow-xl ring-1 ring-emerald-400/30 backdrop-blur">
      <h2 className="font-semibold text-emerald-300">{t.baslik}</h2>

      {onayli ? (
        <>
          <p className="mt-1 text-xs text-slate-400">Kendi kararınla kurduğun plan.</p>
          {mevcutPlan!.ozet && (
            <p className="mt-3 rounded-xl bg-gold/[0.06] px-4 py-2.5 text-sm italic leading-relaxed text-gold-light">
              {mevcutPlan!.ozet}
            </p>
          )}
          <div className="mt-4 space-y-5">
            {ufuklar.map((u) => (
              <div key={u.etiket}>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{u.etiket}</p>
                <ul className="mt-2 space-y-2">
                  {u.maddeler.map((m, i) => (
                    <li key={i} className="rounded-xl bg-midnight-soft/70 p-3 ring-1 ring-white/5">
                      <p className="text-sm font-semibold text-slate-100">{m.baslik}</p>
                      <p className="mt-0.5 text-sm leading-relaxed text-slate-300">{m.aksiyon}</p>
                      {m.olcut && <p className="mt-1 text-xs font-medium text-emerald-300/80">📌 {m.olcut}</p>}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="mt-2 text-sm leading-relaxed text-slate-300">
          Kamptan sonrası için <span className="font-semibold text-emerald-200">90 Günlük Oyun Planını</span> kapanışta
          birlikte kuracağız — kararlar senin olacak. Aynanı özümse; sıra ona gelecek.
        </p>
      )}
    </section>
  );
}
