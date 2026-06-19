// #5 Momentum göstergesi (Görünür İlerleme): adayın haftalık davranış-momentum
// skorunu (0-100) ana sayfada görünür kılar. Skor yoksa hiç çıkmaz. Saf görsel.

export default function MomentumGostergesi({
  skor,
  onceki,
}: {
  skor: number | null;
  onceki: number | null;
}) {
  if (skor === null) return null;

  const renk =
    skor >= 70 ? "from-emerald-500 to-emerald-300" : skor >= 45 ? "from-gold-dim to-gold" : "from-red-500 to-red-400";
  const yon =
    onceki === null ? null : skor > onceki ? "▲" : skor < onceki ? "▼" : "◆";
  const yonRenk = yon === "▲" ? "text-emerald-300" : yon === "▼" ? "text-red-300" : "text-slate-400";
  const band = skor >= 70 ? "güçlü ivme" : skor >= 45 ? "ilerliyorsun" : "ibreyi oynat";

  return (
    <div className="mt-3 rounded-xl border border-royal/25 bg-royal/[0.06] px-3 py-2.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold text-slate-200">📈 Momentum</span>
        <span className="font-mono text-slate-300">
          <span className="text-base font-bold text-gold-light">{skor}</span>
          <span className="text-slate-500">/100</span>
          {yon && <span className={`ml-1.5 ${yonRenk}`}>{yon}</span>}
        </span>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${renk} transition-all duration-700`}
          style={{ width: `${Math.max(3, Math.min(100, skor))}%` }}
        />
      </div>
      <p className="mt-1.5 text-[0.7rem] text-slate-400">
        Çabanın ivmesi — {band}. Sonucu hemen göremesen de ben ölçüyorum.
      </p>
    </div>
  );
}
