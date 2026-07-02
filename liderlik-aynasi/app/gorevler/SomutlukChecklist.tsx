// FAZ 1.1 — SOMUTLUK ŞABLONU: görev gövdesini 5 satırlık bir checklist'e
// ayrıştırır. Katılımcı görev metnini yorumlamak zorunda kalmaz — kim/ne/
// nerede/ne zaman/kanıt tek bakışta net.
export default function SomutlukChecklist({
  somutluk,
}: {
  somutluk: { kim: string | null; ne: string; nerede: string; neZaman: string; kanit: string } | null;
}) {
  if (!somutluk || (!somutluk.ne && !somutluk.nerede && !somutluk.neZaman && !somutluk.kanit)) return null;
  const satirlar = [
    somutluk.kim ? { ikon: "🙋", etiket: "Kim", deger: somutluk.kim } : null,
    somutluk.ne ? { ikon: "🎯", etiket: "Ne", deger: somutluk.ne } : null,
    somutluk.nerede ? { ikon: "📍", etiket: "Nerede", deger: somutluk.nerede } : null,
    somutluk.neZaman ? { ikon: "⏱", etiket: "Ne zaman", deger: somutluk.neZaman } : null,
    somutluk.kanit ? { ikon: "📝", etiket: "Bana ne getireceksin", deger: somutluk.kanit } : null,
  ].filter((s): s is { ikon: string; etiket: string; deger: string } => s !== null);
  if (satirlar.length === 0) return null;

  return (
    <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-xs font-bold uppercase tracking-widest text-slate-400">✅ Özetle</p>
      <ul className="mt-2 space-y-1.5">
        {satirlar.map((s) => (
          <li key={s.etiket} className="flex items-start gap-2 text-sm leading-relaxed text-slate-200">
            <span aria-hidden>{s.ikon}</span>
            <span>
              <span className="font-medium text-slate-400">{s.etiket}:</span> {s.deger}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
