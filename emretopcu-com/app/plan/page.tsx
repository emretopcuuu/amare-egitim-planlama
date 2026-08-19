import type { Metadata } from "next";
import PlanListe from "@/components/PlanListe";
import PlanYazdir from "@/components/PlanYazdir";

export const metadata: Metadata = {
  title: "İlk 72 Saat — Başlangıç Planı | Emre Topçu",
  description:
    "Doğrudan satışta ilk 72 saatini boşa harcamamak için tek sayfalık, yazdırılabilir başlangıç planı.",
  alternates: { canonical: "/plan" },
};

const ADIMLAR = [
  {
    baslik: "Nedenini yaz",
    metin:
      "Bu işi neden yapmak istiyorsun? Tek cümleyle, net. Nedenin güçlüyse nasılın önemi kalmaz.",
  },
  {
    baslik: "Hedefini netleştir",
    metin:
      "Minimum ne kazanırsan gerçekten heyecanlanırsın? Ve buna ne kadar sürede ulaşmak istersin? Öncelik netleşmeden zaman bulunmaz.",
  },
  {
    baslik: "İlk listeni çıkar",
    metin:
      "Bu bir çevre işi değil. Tanıdığın kişilerle başlar, onların çevresiyle katlanır. Aklına gelen ilk isimleri yaz.",
  },
  {
    baslik: "İlk 5 el sıkışma",
    metin:
      "Ben ilk ay yalnızca 5 kişiyle el sıkıştım; ay sonunda ağ 19, ikinci ayda 88 oldu. Sen de küçük başla, düzenli devam et.",
  },
  {
    baslik: "80 / 15 / 5'i unutma",
    metin:
      "Zamanının %5'i toplantıya ve kampa gider ama sonucun %80'i oradan gelir. Doğru yerde ol.",
  },
  {
    baslik: "72 saat kuralı",
    metin:
      "İlk gün heyecan doruktadır, üçüncü gün söner. Bu normaldir. Motivasyonu değil; iradeyi ve alışkanlığı yönet.",
  },
];

export default function PlanSayfa() {
  return (
    <main className="min-h-[100dvh] bg-abanoz font-sahne text-fildisi print:bg-white">
      <div className="mx-auto max-w-3xl px-6 py-16 print:py-8">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-sm font-medium tracking-[0.2em] text-altin uppercase">
              İlk 72 Saat
            </p>
            <h1 className="mt-3 font-lux text-4xl font-semibold tracking-tight md:text-5xl">
              Başlangıç Planı
            </h1>
          </div>
          <a
            href="/"
            className="mt-1 text-sm text-duman hover:text-altin print:hidden"
          >
            ← Ana sayfa
          </a>
        </div>
        <p className="mt-5 max-w-[60ch] text-duman">
          Başlarsan boşluğa düşmezsin. Aşağıdaki altı adımı ilk 72 saatinde
          sırayla yap; her birini işaretle. — Emre Topçu
        </p>

        <PlanListe adimlar={ADIMLAR} />

        <div className="mt-12 flex flex-wrap items-center gap-4">
          <PlanYazdir />
          <span className="font-imza text-3xl text-altin">Emre Topçu</span>
        </div>
        <p className="mt-8 text-sm text-duman">emretopcu.ai</p>
      </div>
    </main>
  );
}
