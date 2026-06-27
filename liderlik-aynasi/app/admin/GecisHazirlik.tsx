export type HazirlikKontrol = { ad: string; tamam: boolean };

export default function GecisHazirlik({
  baslik,
  kontroller,
}: {
  baslik: string;
  kontroller: HazirlikKontrol[];
}) {
  if (kontroller.length === 0) return null;
  const tamamSayi = kontroller.filter((k) => k.tamam).length;
  const yuzde = Math.round((tamamSayi / kontroller.length) * 100);
  const hazir = yuzde === 100;

  return (
    <details
      open={!hazir}
      className="group rounded-2xl border border-royal/25 bg-midnight-card/40"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 [&::-webkit-details-marker]:hidden">
        <span className="text-sm font-semibold text-slate-200">🚦 {baslik}</span>
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-white/10">
            <div
              className={`h-full rounded-full transition-all ${hazir ? "bg-emerald-400" : "bg-amber-400"}`}
              style={{ width: `${yuzde}%` }}
            />
          </div>
          <span className={`shrink-0 text-sm font-bold tabular-nums ${hazir ? "text-emerald-300" : "text-amber-300"}`}>
            {tamamSayi}/{kontroller.length}
          </span>
          <span className="shrink-0 text-slate-500 transition-transform group-open:rotate-90" aria-hidden>▶</span>
        </div>
      </summary>
      <div className="px-4 pb-4">
        <ul className="space-y-1.5">
          {kontroller.map((k) => (
            <li key={k.ad} className="flex items-center gap-2 text-sm">
              <span aria-hidden className={k.tamam ? "text-emerald-300" : "text-slate-500"}>
                {k.tamam ? "✓" : "○"}
              </span>
              <span className={k.tamam ? "text-slate-300" : "text-slate-400"}>{k.ad}</span>
            </li>
          ))}
        </ul>
        {hazir && (
          <p className="mt-2 text-xs font-medium text-emerald-300/90">Bu aşama için her şey hazır. ✓</p>
        )}
      </div>
    </details>
  );
}
