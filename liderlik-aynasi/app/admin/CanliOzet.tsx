import Link from "next/link";
import { tr } from "@/lib/i18n/tr";

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
}: {
  katilimci: number;
  ozTamam: number;
  ozToplam: number;
  gorus: number;
  dalgaAd: string | null;
}) {
  const kutular = [
    { buyuk: String(katilimci), kucuk: t.katilimci, href: "/admin/katilimcilar" },
    { buyuk: `${ozTamam}/${ozToplam}`, kucuk: t.ozPuan, href: "#ilerleme" },
    { buyuk: String(gorus), kucuk: t.gorus, href: "#ilerleme" },
    { buyuk: dalgaAd ?? t.dalgaYok, kucuk: t.dalga, href: "#dalga" },
  ];
  return (
    <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {kutular.map((k) => (
        <Link
          key={k.kucuk}
          href={k.href}
          className="kart-3d rounded-2xl bg-midnight-card/60 p-4 text-center shadow-xl ring-1 ring-royal/30 backdrop-blur transition-colors hover:ring-gold/40"
        >
          <p className="truncate text-2xl font-bold text-gold">{k.buyuk}</p>
          <p className="mt-1 text-xs text-slate-400">{k.kucuk}</p>
        </Link>
      ))}
    </section>
  );
}
