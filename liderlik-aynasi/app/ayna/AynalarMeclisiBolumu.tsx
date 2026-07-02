import type { AynalarMeclisi } from "@/lib/aynalarMeclisi";
import { tr } from "@/lib/i18n/tr";
import AynaIkon from "@/components/AynaIkon";

const t = tr.ayna;

// AYNALAR MECLİSİ bölümü — kapanış raporunda aidiyet anı. Kişiye, kendi yolunu
// paylaşan kohort arkadaşlarını gösterir; hem eşsiz hem ait hissettirir.
export default function AynalarMeclisiBolumu({ veri }: { veri: AynalarMeclisi }) {
  return (
    <section className="kart-cam relative overflow-hidden rounded-2xl bg-gradient-to-br from-royal/[0.14] to-midnight-card/60 p-5 ring-1 ring-royal/30">
      <div className="flex items-center gap-2">
        <AynaIkon className="h-5 w-5 text-royal-light" />
        <h2 className="font-semibold text-royal-light">{t.meclisBaslik}</h2>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-slate-100">
        {t.meclisMetin(veri.benzerSayi, veri.etiket)}
      </p>
      <p className="mt-2 text-sm italic leading-relaxed text-slate-300">{veri.icgoru}</p>
    </section>
  );
}
