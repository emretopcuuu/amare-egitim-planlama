import { tr } from "@/lib/i18n/tr";

// [YOLCULUK #6] FAZ ÇUBUĞU — kişi 90 günün 6 evresinin (YOLCULUK_FAZLARI)
// neresinde olduğunu tek bakışta görür. Saf sunum bileşeni: sunucu fazları
// hesaplayıp verir (davranis.ts'i buraya import etmeden — client/server sınırı
// temiz kalsın). Yalnız mod === "yolculuk" iken render edilir.
export default function YolculukFazSeridi({
  fazlar,
  aktifIndex,
  aktifAd,
}: {
  fazlar: { ad: string }[];
  aktifIndex: number;
  aktifAd: string;
}) {
  const t = tr.yolculukUx;
  const aciklama = t.fazAciklama[aktifAd] ?? "";
  return (
    <section className="mt-3 rounded-2xl border border-gold/25 bg-gold/[0.05] p-3">
      <div className="flex items-center justify-between">
        <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-slate-400">
          {t.fazBaslik}
        </p>
        <p className="text-xs font-bold text-gold-light">{aktifAd}</p>
      </div>
      {/* 6 segment — geçilenler dolu, aktif parlak, gelecek sönük */}
      <div className="mt-2 flex gap-1" aria-hidden>
        {fazlar.map((f, i) => (
          <span
            key={f.ad}
            title={f.ad}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i < aktifIndex
                ? "bg-gold/50"
                : i === aktifIndex
                  ? "bg-gold shadow-[0_0_10px_-1px_rgba(212,175,55,0.7)]"
                  : "bg-white/10"
            }`}
          />
        ))}
      </div>
      {aciklama && <p className="mt-2 text-xs leading-relaxed text-slate-300">{aciklama}</p>}
    </section>
  );
}
