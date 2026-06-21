import Link from "next/link";
import { tr } from "@/lib/i18n/tr";
import Ipucu from "./Ipucu";

const t = tr.admin.ozet;

// #7 Tek bakış canlı özet: adminin telefonda nabzı bir bakışta görmesi için
// büyük rakamlar. Her kutu artık TIKLANIR — rakamdan ilgili çalışma alanına
// atlar (öz-puan → eksik liste, dalga → kontrol). Rakam + eylem birleşik.
export default function CanliOzet({
  katilimci,
  ozTamam,
  ozToplam,
  gorus,
  dalgaAd,
  ciplak = false,
}: {
  katilimci: number;
  ozTamam: number;
  ozToplam: number;
  gorus: number;
  dalgaAd: string | null;
  // ciplak: "Genel Durum" kartı içinde kapsayıcısız (kendi section/Ipucu'su yok)
  // ve düz döşeme kutularıyla render edilir; tek başına kullanımda eski kart hali.
  ciplak?: boolean;
}) {
  const kutular = [
    { buyuk: String(katilimci), kucuk: t.katilimci, href: "/admin/katilimcilar" },
    { buyuk: `${ozTamam}/${ozToplam}`, kucuk: t.ozPuan, href: "#ilerleme" },
    { buyuk: String(gorus), kucuk: t.gorus, href: "#ilerleme" },
    { buyuk: dalgaAd ?? t.dalgaYok, kucuk: t.dalga, href: "#dalga" },
  ];
  const izgara = (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {kutular.map((k) => (
        <Link
          key={k.kucuk}
          href={k.href}
          className={
            ciplak
              ? "rounded-xl bg-midnight-soft p-4 text-center transition-colors hover:bg-midnight-soft/70"
              : "kart-3d rounded-2xl bg-midnight-card/60 p-4 text-center shadow-xl ring-1 ring-royal/30 backdrop-blur transition-colors hover:ring-gold/40"
          }
        >
          <p className="truncate text-2xl font-bold text-gold">{k.buyuk}</p>
          <p className="mt-1 text-xs text-slate-400">{k.kucuk}</p>
        </Link>
      ))}
    </div>
  );
  if (ciplak) return izgara;
  return (
    <section className="space-y-2">
      <div className="flex justify-end">
        <Ipucu {...tr.admin.yardim.panelOzet} />
      </div>
      {izgara}
    </section>
  );
}
