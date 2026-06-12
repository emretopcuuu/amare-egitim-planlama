import Link from "next/link";
import { tr } from "@/lib/i18n/tr";

type Props = {
  hedefId: string;
  ad: string;
  altYazi: string | null;
  yapilan: number;
  toplam: number;
  kilitli: boolean;
};

// Değerlendirme merkezindeki tek kişi satırı: ilerleme + duruma göre eylem.
export default function KisiSatiri({
  hedefId,
  ad,
  altYazi,
  yapilan,
  toplam,
  kilitli,
}: Props) {
  const tamam = yapilan >= toplam;
  const etiket = tamam
    ? tr.degerlendir.duzenle
    : yapilan > 0
      ? tr.degerlendir.devamEt
      : tr.degerlendir.basla;

  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <div className="min-w-0">
        <p className="truncate text-lg font-semibold text-slate-100">
          {tamam && <span className="mr-1 text-emerald-400">✓</span>}
          {ad}
        </p>
        <p className="mt-0.5 text-sm text-slate-400">
          {altYazi ? `${altYazi} · ` : ""}
          {tr.degerlendir.ilerleme(yapilan, toplam)}
        </p>
      </div>
      {kilitli ? (
        <span
          title={tr.degerlendir.kilitliIpucu}
          className="shrink-0 rounded-xl border border-royal-light/30 px-5 py-3 text-base text-slate-500"
        >
          🔒
        </span>
      ) : (
        <Link
          href={`/degerlendir/${hedefId}`}
          className={`shrink-0 rounded-xl px-5 py-3 text-base font-bold transition-colors ${
            tamam
              ? "border border-royal-light/40 text-slate-300 hover:bg-midnight-soft"
              : "btn-kor"
          }`}
        >
          {etiket}
        </Link>
      )}
    </div>
  );
}
