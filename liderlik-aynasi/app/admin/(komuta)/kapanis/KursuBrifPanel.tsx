import { supabaseAdmin } from "@/lib/supabase/server";
import { kursuBrifi } from "@/lib/rekorlar";
import Katlanir from "../../Katlanir";

// KAPANIŞ — "AYNA seni böyle seçti" KÜRSÜ BRİFİ (admin, İSİMLİ).
// Her kategorinin 1./2./3.'sü + veriden türeyen gerekçe. Sahnede Emre'nin ödül
// listesi. 2./3. YEDEK: 1. kişi çıkmak istemezse bir alttakini çağır.
// Canlı veriyle çalışır; kamp kapalıyken (prova) eldeki veriyle önizlenir.
export default async function KursuBrifPanel() {
  const db = supabaseAdmin();
  const brif = await kursuBrifi(db);
  const doluKategori = brif.filter((s) => s.adaylar.length > 0).length;

  const madalya = ["🥇", "🥈", "🥉"];

  return (
    <Katlanir
      baslik="Kürsü Brifi — AYNA kimi seçti"
      aciklama="Sahne ödülleri · her kategoride 1. + 2./3. yedek · isimli, yalnız senin gözünle"
      ikon="🏆"
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-gold/25 bg-gold/[0.05] p-4 text-sm text-slate-300">
          <p className="font-semibold text-gold-light">Sahnede nasıl kullanılır</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-400">
            <li>Kategoriyi söyle (ör. &quot;Kampın En Üretkeni…&quot;), 🥇 kişiyi çağır.</li>
            <li>AYNA gerekçesini oku — hepsi gerçek veriden, uydurma yok.</li>
            <li><strong className="text-slate-300">Önce onay:</strong> kişiye kamptan önce özelce sor (&quot;seni sahneye davet edeyim mi?&quot;). İstemezse 🥈/🥉 yedeği çağır.</li>
            <li>Aynı kişi birden çok kategoride çıkabilir — sahnede bir kez çağır, tekrarı yedekten doldur.</li>
          </ul>
          <p className="mt-2 text-xs text-slate-500">
            {doluKategori}/{brif.length} kategoride aday var. Kamp ilerledikçe canlı değişir; sahneden önce bu sayfayı tazele.
          </p>
        </div>

        <div className="grid gap-3">
          {brif.map((s) => (
            <div
              key={s.kategori.key}
              className="rounded-2xl border border-royal/25 bg-midnight-card/40 p-4"
            >
              <div className="flex items-center gap-2">
                <span className="text-xl" aria-hidden>{s.kategori.ikon}</span>
                <span className="text-sm font-bold text-gold-light">{s.kategori.ad}</span>
              </div>

              {s.adaylar.length === 0 ? (
                <p className="mt-2 pl-7 text-xs italic text-slate-500">Henüz aday yok.</p>
              ) : (
                <ul className="mt-2 space-y-1.5">
                  {s.adaylar.map((a) => (
                    <li
                      key={a.pid}
                      className={`flex items-start gap-2 ${a.sira === 1 ? "" : "opacity-70"}`}
                    >
                      <span className="shrink-0 text-base" aria-hidden>{madalya[a.sira - 1]}</span>
                      <span className="min-w-0">
                        <span className="text-sm font-semibold text-slate-100">{a.ad}</span>
                        {a.sira === 1 ? (
                          <>
                            <span className="mt-0.5 block text-xs text-slate-400">{a.gerekce}</span>
                            <span className="mt-0.5 block text-xs italic text-gold-light">
                              🎤 &quot;{s.kategori.onur}&quot;
                            </span>
                          </>
                        ) : (
                          <span className="ml-1 text-xs text-slate-500">(yedek)</span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>
    </Katlanir>
  );
}
