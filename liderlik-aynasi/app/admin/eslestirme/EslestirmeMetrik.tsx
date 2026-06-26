import { tr } from "@/lib/i18n/tr";

const t = tr.eslestirmeMetrik;

type Atama = {
  observerId: string;
  targetId: string;
  observerTakim: string | null;
  targetTakim: string | null;
};

type Metrik = {
  kapsamli: number;
  toplam: number;
  takimFarkiYuzde: number;
  minYuk: number;
  maksYuk: number;
};

function hesaplaMetrik(atamalar: Atama[], katilimciSayisi: number): Metrik {
  // Kaç kişi en az 2 gözlemci aldı?
  const targetSayac = new Map<string, number>();
  const observerSayac = new Map<string, number>();
  let takimFarki = 0;

  for (const a of atamalar) {
    targetSayac.set(a.targetId, (targetSayac.get(a.targetId) ?? 0) + 1);
    observerSayac.set(a.observerId, (observerSayac.get(a.observerId) ?? 0) + 1);
    if (a.observerTakim && a.targetTakim && a.observerTakim !== a.targetTakim) takimFarki++;
  }

  const kapsamli = [...targetSayac.values()].filter((n) => n >= 2).length;
  const yukler = [...observerSayac.values()];
  const minYuk = yukler.length > 0 ? Math.min(...yukler) : 0;
  const maksYuk = yukler.length > 0 ? Math.max(...yukler) : 0;
  const takimFarkiYuzde =
    atamalar.length > 0 ? Math.round((takimFarki / atamalar.length) * 100) : 0;

  return { kapsamli, toplam: katilimciSayisi, takimFarkiYuzde, minYuk, maksYuk };
}

function MetrikSatir({
  etiket,
  aciklama,
  iyi,
}: {
  etiket: string;
  aciklama: string;
  iyi: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <span
        className={`mt-0.5 shrink-0 text-base ${iyi ? "text-emerald-400" : "text-amber-400"}`}
      >
        {iyi ? "✓" : "⚠"}
      </span>
      <div>
        <p className="text-sm font-semibold text-slate-200">{etiket}</p>
        <p className="text-xs text-slate-400">{aciklama}</p>
      </div>
    </div>
  );
}

export default function EslestirmeMetrik({
  atamalar,
  katilimciSayisi,
}: {
  atamalar: Atama[];
  katilimciSayisi: number;
}) {
  if (atamalar.length === 0) return null;

  const m = hesaplaMetrik(atamalar, katilimciSayisi);
  const kapsamYuzde = m.toplam > 0 ? Math.round((m.kapsamli / m.toplam) * 100) : 0;

  return (
    <section className="kart-3d rounded-2xl bg-midnight-card/60 p-5 ring-1 ring-royal/30">
      <h2 className="mb-4 text-base font-semibold text-gold-light">{t.baslik}</h2>
      <div className="space-y-3">
        <MetrikSatir
          etiket={t.kapsam}
          aciklama={t.kapsamAciklama(m.kapsamli, m.toplam)}
          iyi={kapsamYuzde >= t.iyiSinir}
        />
        <MetrikSatir
          etiket={t.takimFarki}
          aciklama={t.takimFarkiAciklama(m.takimFarkiYuzde)}
          iyi={m.takimFarkiYuzde >= t.iyiSinir}
        />
        {m.minYuk > 0 && (
          <MetrikSatir
            etiket={t.yukDengesi}
            aciklama={t.yukDengesiAciklama(m.minYuk, m.maksYuk)}
            iyi={m.maksYuk - m.minYuk <= 2}
          />
        )}
      </div>
      {/* Kapsam progress bar */}
      <div className="mt-4">
        <div className="mb-1 flex items-center justify-between text-xs text-slate-400">
          <span>{t.kapsam}</span>
          <span className={kapsamYuzde >= t.iyiSinir ? "text-emerald-400" : "text-amber-400"}>
            %{kapsamYuzde}
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-midnight-soft">
          <div
            className={`h-full rounded-full transition-all ${
              kapsamYuzde >= t.iyiSinir ? "bg-emerald-400" : "bg-amber-400"
            }`}
            style={{ width: `${kapsamYuzde}%` }}
          />
        </div>
      </div>
    </section>
  );
}
