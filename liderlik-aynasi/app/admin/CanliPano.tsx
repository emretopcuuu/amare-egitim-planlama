import { tr } from "@/lib/i18n/tr";
import type { IzgaraKisi, TeslimSatir, TakimSatir, IzgaraDurum } from "@/lib/canliPano";

const t = tr.admin.canliPano;
const tg = tr.gorevler.turler;

const DURUM_RENK: Record<IzgaraDurum, string> = {
  aktif: "bg-emerald-500",
  bekliyor: "bg-amber-400",
  sessiz: "bg-red-500",
  bos: "bg-slate-700",
};

// CANLI PANO — adminin kampın nabzını tek bakışta gördüğü üç panel. OtoYenile
// (panel üstü) 25 sn'de bir sayfayı tazeler; veriler bununla canlı kalır.
export default function CanliPano({
  izgara,
  teslimler,
  takimlar,
  ozet,
}: {
  izgara: IzgaraKisi[];
  teslimler: TeslimSatir[];
  takimlar: TakimSatir[];
  ozet: { aktif: number; bekliyor: number; sessiz: number; bos: number };
}) {
  const enYuksek = takimlar[0]?.ort ?? 10;

  return (
    <section className="space-y-5">
      {/* #1 Katılımcı canlı ızgarası */}
      <div className="kart-3d rounded-2xl bg-midnight-card/60 p-5 shadow-xl ring-1 ring-royal/30 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-200">{t.izgaraBaslik}</h2>
          <div className="flex flex-wrap gap-3 text-xs" role="group" aria-label={t.izgaraBaslik}>
            {(["aktif", "bekliyor", "sessiz", "bos"] as const).map((d) => (
              <span key={d} className="inline-flex items-center gap-1.5 text-slate-400">
                <span className={`h-2.5 w-2.5 rounded-sm ${DURUM_RENK[d]}`} aria-hidden />
                {t.durumlar[d]} · {ozet[d]}
              </span>
            ))}
          </div>
        </div>
        {izgara.length === 0 ? (
          <BosKutu ikon="📊" baslik={t.izgaraBos} alt={t.izgaraBosAlt} />
        ) : (
          <div className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(1.4rem,1fr))] gap-1.5">
            {izgara.map((k) => (
              <span
                key={k.id}
                role="img"
                aria-label={`${k.ad}${k.takim ? ` · ${k.takim}` : ""} — ${t.durumlar[k.durum]}`}
                title={`${k.ad}${k.takim ? ` · ${k.takim}` : ""} — ${t.durumlar[k.durum]}`}
                className={`aspect-square rounded-sm ${DURUM_RENK[k.durum]} ${
                  k.durum === "sessiz"
                    ? "ring-1 ring-red-300/50"
                    : k.durum === "bos"
                      ? "opacity-50"
                      : ""
                }`}
              />
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* #4 Canlı teslim akışı */}
        <div className="kart-3d rounded-2xl bg-midnight-card/60 p-5 shadow-xl ring-1 ring-royal/30 backdrop-blur">
          <h2 className="text-lg font-semibold text-slate-200">{t.akisBaslik}</h2>
          {teslimler.length === 0 ? (
            <BosKutu ikon="📭" baslik={t.akisYok} alt={t.akisYokAlt} />
          ) : (
            <ul className="mt-3 space-y-2">
              {teslimler.map((g) => (
                <li
                  key={g.id}
                  className="flex items-center gap-3 rounded-xl bg-midnight-soft px-3 py-2 text-sm"
                >
                  <span className="shrink-0" aria-hidden>
                    {(tg[g.tur as keyof typeof tg] ?? "📝").split(" ")[0]}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-slate-200">
                    <span className="font-semibold text-gold-light">{g.ad}</span>{" "}
                    <span className="text-slate-400">— {g.baslik}</span>
                  </span>
                  {g.puan !== null ? (
                    <span className="shrink-0 font-bold text-gold">{g.puan}/10</span>
                  ) : (
                    <span className="shrink-0 text-xs text-amber-300">{t.bekliyorRozet}</span>
                  )}
                  <span className="shrink-0 text-xs text-slate-500">{g.bagil}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* #10 Takım karşılaştırma sıralaması */}
        <div className="kart-3d rounded-2xl bg-midnight-card/60 p-5 shadow-xl ring-1 ring-royal/30 backdrop-blur">
          <h2 className="text-lg font-semibold text-slate-200">{t.takimBaslik}</h2>
          {takimlar.length === 0 ? (
            <BosKutu ikon="🏆" baslik={t.takimBos} alt={t.takimBosAlt} />
          ) : (
            <ul className="mt-3 space-y-2.5">
              {takimlar.map((tk, i) => (
                <li key={tk.takim} className="flex items-center gap-3">
                  <span className="w-5 shrink-0 text-center text-sm font-bold text-slate-400">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-sm font-medium text-slate-200">
                        {tk.takim}
                      </span>
                      <span className="shrink-0 text-sm font-bold text-gold">
                        {tk.ort.toFixed(1)}
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-midnight-soft">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-royal to-gold"
                        style={{ width: `${(tk.ort / Math.max(enYuksek, 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {takimlar.length > 0 && <p className="mt-3 text-xs text-slate-500">{t.takimNot}</p>}
        </div>
      </div>
    </section>
  );
}

// Boş durum kutusu — donuk/boş metin yerine ikon + açıklama (panel "bozuk mu?"
// hissi vermesin).
function BosKutu({ ikon, baslik, alt }: { ikon: string; baslik: string; alt: string }) {
  return (
    <div className="mt-4 rounded-xl border border-white/5 bg-white/[0.02] px-5 py-8 text-center">
      <p className="text-3xl" aria-hidden>
        {ikon}
      </p>
      <p className="mt-2 text-sm font-medium text-slate-300">{baslik}</p>
      <p className="mt-1 text-xs text-slate-500">{alt}</p>
    </div>
  );
}
