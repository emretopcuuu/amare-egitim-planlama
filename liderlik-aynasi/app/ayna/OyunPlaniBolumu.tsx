"use client";

import { useEffect, useRef, useState } from "react";
import { tr } from "@/lib/i18n/tr";
import AynaDusunuyor from "@/components/AynaDusunuyor";
import type { OyunPlani, PlanMadde } from "@/lib/oyunPlani";

const t = tr.oyunPlani;

// 10/40/90 gün oyun planı — rapor açılınca otomatik üretilir (mektup gibi istek
// üzerine, ama mount'ta tetiklenir; plan raporun çekirdeği, kullanıcı beklemesin).
export default function OyunPlaniBolumu({ mevcutPlan }: { mevcutPlan: OyunPlani | null }) {
  const [plan, setPlan] = useState<OyunPlani | null>(mevcutPlan);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState(false);
  const denendi = useRef(false);

  async function olustur() {
    if (yukleniyor) return;
    setYukleniyor(true);
    setHata(false);
    try {
      const res = await fetch("/api/oyun-plani", { method: "POST" });
      const veri = await res.json().catch(() => null);
      if (res.ok && veri?.durum === "hazir") setPlan(veri.plan as OyunPlani);
      else setHata(true);
    } catch {
      setHata(true);
    } finally {
      setYukleniyor(false);
    }
  }

  useEffect(() => {
    if (plan || denendi.current) return;
    denendi.current = true;
    void olustur();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ufuklar: { etiket: string; renk: string; maddeler: PlanMadde[] }[] = plan
    ? [
        { etiket: t.onGun, renk: "emerald", maddeler: plan.on_gun },
        { etiket: t.kirkGun, renk: "gold", maddeler: plan.kirk_gun },
        { etiket: t.doksanGun, renk: "royal", maddeler: plan.doksan_gun },
      ]
    : [];

  return (
    <section className="kart-cerceve rounded-2xl bg-gradient-to-br from-emerald-500/15 to-midnight-card/60 p-5 shadow-xl ring-1 ring-emerald-400/30 backdrop-blur">
      <h2 className="font-semibold text-emerald-300">{t.baslik}</h2>
      <p className="mt-1 text-xs text-slate-400">{t.aciklama}</p>

      {plan ? (
        <>
          {plan.ozet && (
            <p className="mt-3 rounded-xl bg-gold/[0.06] px-4 py-2.5 text-sm italic leading-relaxed text-gold-light">
              {plan.ozet}
            </p>
          )}
          <div className="mt-4 space-y-5">
            {ufuklar.map((u) => (
              <div key={u.etiket}>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{u.etiket}</p>
                <ul className="mt-2 space-y-2">
                  {u.maddeler.map((m, i) => (
                    <li
                      key={i}
                      className="rounded-xl bg-midnight-soft/70 p-3 ring-1 ring-white/5"
                    >
                      <p className="text-sm font-semibold text-slate-100">{m.baslik}</p>
                      <p className="mt-0.5 text-sm leading-relaxed text-slate-300">{m.aksiyon}</p>
                      <p className="mt-1 text-xs font-medium text-emerald-300/80">📌 {m.olcut}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </>
      ) : yukleniyor ? (
        <AynaDusunuyor satirlar={tr.dusunuyor.mektup} />
      ) : (
        <div className="mt-4 text-center">
          <button
            onClick={olustur}
            className="btn-3d rounded-xl bg-emerald-500 px-5 py-2.5 font-semibold text-[#04140c] transition-colors hover:bg-emerald-400"
          >
            {hata ? tr.durum.tekrar : t.olustur}
          </button>
        </div>
      )}
    </section>
  );
}
