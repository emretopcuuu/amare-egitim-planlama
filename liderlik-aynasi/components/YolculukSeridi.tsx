import { KAMP_GUNLERI, kampGunu } from "@/lib/kampProgrami";
import { tr } from "@/lib/i18n/tr";

const t = tr.yolculuk;
const ILK = KAMP_GUNLERI[0];
const SON = KAMP_GUNLERI[KAMP_GUNLERI.length - 1];

// #5 "Sen neredesin": kampın 3 günlük + sonrası yolculuğunda kişinin nerede
// olduğunu gösteren ince şerit. Belirsizlik en büyük stres — aday yolun
// neresinde olduğunu bir bakışta görsün. bugun = Istanbul "YYYY-MM-DD".
export default function YolculukSeridi({ bugun }: { bugun: string }) {
  const gun = kampGunu(bugun); // 1-3 | null
  const oncesi = bugun < ILK;
  const sonrasi = bugun > SON;

  const etiket = oncesi ? t.hazirlik : gun ? t.gun(gun) : t.sonrasi;

  function gunDurumu(g: number): "gecti" | "simdi" | "gelecek" {
    if (gun) return g < gun ? "gecti" : g === gun ? "simdi" : "gelecek";
    return oncesi ? "gelecek" : "gecti"; // sonrasıysa 3 kamp günü de geçti
  }

  return (
    <div className="mt-3" aria-label={etiket}>
      <div className="flex items-center gap-1.5">
        {[1, 2, 3].map((g) => {
          const d = gunDurumu(g);
          return (
            <span
              key={g}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                d === "simdi"
                  ? "bg-gold"
                  : d === "gecti"
                    ? "bg-gold/45"
                    : "bg-white/15"
              }`}
            />
          );
        })}
        {/* 90 günlük yolculuk segmenti */}
        <span
          className={`h-1.5 w-6 rounded-full ${
            sonrasi ? "bg-emerald-400" : "bg-white/10"
          }`}
        />
      </div>
      <p className="mt-1.5 text-xs font-medium text-slate-400">{etiket}</p>
    </div>
  );
}
