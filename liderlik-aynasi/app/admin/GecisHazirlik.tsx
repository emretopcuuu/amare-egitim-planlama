// UX #4 + #9 — Aşama hazırlık skoru + geçiş checklist'i. Tek bir "%" ile
// "bu aşamaya/geçişe hazır mıyım?" sorusunu yanıtlar; altındaki maddeler
// neyin eksik olduğunu gösterir. Kritik bir anahtara basmadan önce gözden geçir.
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
    <section className="rounded-2xl border border-royal/25 bg-midnight-card/40 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-200">🚦 {baslik}</p>
        <span
          className={`text-sm font-bold tabular-nums ${
            hazir ? "text-emerald-300" : "text-amber-300"
          }`}
        >
          %{yuzde}
        </span>
      </div>
      {/* İlerleme çubuğu */}
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full transition-all ${
            hazir ? "bg-emerald-400" : "bg-amber-400"
          }`}
          style={{ width: `${yuzde}%` }}
        />
      </div>
      {/* Checklist */}
      <ul className="mt-3 space-y-1.5">
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
        <p className="mt-2 text-xs font-medium text-emerald-300/90">
          Bu aşama için her şey hazır. ✓
        </p>
      )}
    </section>
  );
}
