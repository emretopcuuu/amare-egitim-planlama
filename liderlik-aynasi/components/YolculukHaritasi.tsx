import { Fragment } from "react";

// YOLCULUK HARİTASI — katılımcı kampın 3 günlük yayında nerede olduğunu tek
// bakışta görür: tamamlanan fazlar dolu, şu anki faz nabız atar, sıradakiler
// soluk. "Buradasın + sırada ne var" yön duygusu. Saf sunucu bileşeni.
export type YolcuFaz = { ad: string; tamam: boolean };

export default function YolculukHaritasi({
  fazlar,
  siradaEtiket,
  gunEtiketi,
}: {
  fazlar: YolcuFaz[];
  siradaEtiket: string;
  gunEtiketi?: string;
}) {
  if (fazlar.length === 0) return null;
  const ilkEksik = fazlar.findIndex((f) => !f.tamam);
  const suAn = ilkEksik === -1 ? fazlar.length - 1 : ilkEksik;

  return (
    <div className="rounded-2xl border border-royal/25 bg-[#08182a]/70 px-3 py-2.5 backdrop-blur-sm">
      <div className="flex items-center gap-1">
        {fazlar.map((f, i) => {
          const cur = i === suAn && !f.tamam;
          return (
            <Fragment key={f.ad}>
              {i > 0 && (
                <span
                  className={`h-px flex-1 ${i <= suAn ? "bg-gold/60" : "bg-white/10"}`}
                />
              )}
              <span
                className={`relative flex h-3 w-3 shrink-0 items-center justify-center rounded-full ${
                  f.tamam
                    ? "bg-gold"
                    : cur
                      ? "bg-gold/30 ring-2 ring-gold"
                      : "bg-white/15"
                }`}
              >
                {cur && (
                  <span className="absolute inset-0 animate-ping rounded-full bg-gold/40" />
                )}
              </span>
            </Fragment>
          );
        })}
      </div>
      <p className="mt-1.5 text-center text-xs text-slate-300">
        {gunEtiketi && (
          <span className="mr-1.5 text-slate-500">{gunEtiketi} ·</span>
        )}
        <span className="font-semibold text-gold-light">{fazlar[suAn].ad}</span>
        {suAn < fazlar.length - 1 && (
          <span className="text-slate-500">
            {" · "}
            {siradaEtiket} {fazlar[suAn + 1].ad}
          </span>
        )}
      </p>
    </div>
  );
}
