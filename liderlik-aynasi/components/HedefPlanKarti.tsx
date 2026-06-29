import { tlFormat, type KariyerPlani } from "@/lib/kariyer";
import { tr } from "@/lib/i18n/tr";

const t = tr.hedef;

// Kişisel kariyer planı kartı — hedef akışında (mühür) VE profilde (kamp sonrası
// 90 gün erişimi) aynı görünüm. Sunucu/istemci her iki bağlamda da çalışır.
export default function HedefPlanKarti({ plan }: { plan: KariyerPlani }) {
  const km = plan.kilometreTaslari;
  const ara = km.slice(0, -1);
  const ana = km[km.length - 1];
  return (
    <div className="kart-cam overflow-hidden rounded-2xl shadow-[0_22px_55px_-26px_rgba(15,30,50,0.45)]">
      <div className="border-l-4 border-emerald-400 bg-emerald-500/15 px-5 py-3">
        <p className="kariyer-vurgu text-lg font-bold">{t.planBaslik(plan.rutbe)}</p>
        <p className="text-xs text-slate-300">
          {t.planOzet(plan.sureAy, plan.gunlukSaatEtiket, plan.haftalikSaat)}
        </p>
      </div>
      <dl className="kariyer-bol px-5 py-1 text-sm">
        {ara.map((k, i) => (
          <SatirKV
            key={k.rutbe}
            k={i === 0 ? t.ilkHedef(k.ay) : t.ikinciHedef(k.ay)}
            v={`${k.rutbe} — ${tlFormat(k.gelir, k.arti)} ${t.aylikBirim}`}
          />
        ))}
        <div className="flex items-baseline justify-between gap-3 py-3">
          <dt className="text-slate-400">{t.anaHedef(ana.ay)}</dt>
          <dd className="kariyer-vurgu text-right text-lg font-bold">
            {ana.rutbe} — {tlFormat(ana.gelir, ana.arti)} {t.aylikBirim}
          </dd>
        </div>
        <SatirKV k={t.gunlukYatirim} v={plan.gunlukSaatEtiket} guclu />
        <SatirKV
          k={t.toplamYatirim}
          v={t.toplamYatirimDeger(plan.toplamSaat, tlFormat(plan.toplamPara))}
          guclu
        />
        <SatirKV k={t.geriDonus} v={t.geriDonusDeger(plan.geriDonusAy)} guclu />
        <p className="pb-1 pt-1 text-[0.7rem] leading-relaxed text-slate-500">{t.geriDonusNot}</p>
      </dl>
      <div className="bg-gold/[0.06] px-5 py-3">
        <p className="kariyer-baslik text-sm leading-relaxed">
          {t.bunuDusun(
            plan.gunlukSaatEtiket,
            plan.sureAy,
            tlFormat(plan.gelir, plan.gelirArti),
            tlFormat(plan.saatlikKazanc)
          )}
        </p>
      </div>
    </div>
  );
}

function SatirKV({ k, v, guclu }: { k: string; v: string; guclu?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2.5">
      <dt className="text-slate-400">{k}</dt>
      <dd className={`text-right ${guclu ? "font-bold text-slate-100" : "font-medium text-slate-200"}`}>{v}</dd>
    </div>
  );
}
