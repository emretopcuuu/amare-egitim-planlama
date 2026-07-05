import { supabaseAdmin } from "@/lib/supabase/server";
import { onboardingDurumlari } from "@/lib/onboardingTakip";
import { tr } from "@/lib/i18n/tr";
import { BAGLANTI_TABANI } from "@/lib/whatsappSablonlari";

// [E6] "ONBOARDING'DE TAKILANLAR" — kayıp radarı deseninin kamp ÖNCESİ kardeşi:
// onboarding'e başlamış (rıza vermiş) ama bitirmemiş kişiler; takıldığı adım +
// son ilerleme zamanı + hazır mesajlı wa.me linki. Otomatik WhatsApp GÖNDERİMİ
// YOK — admin dokunup gönderir. Takılan kimse yoksa hiç render edilmez
// (kamp canlıyken görünmez kalır, panele gürültü eklemez).
export default async function OnboardingTakilanlar() {
  const durumlar = await onboardingDurumlari(supabaseAdmin());
  const takilanlar = durumlar.filter((d) => d.rizaVar && d.eksikAdim !== null);
  if (takilanlar.length === 0) return null;

  // En uzun süredir ilerlemeyen en üstte (insan dokunuşu önceliği).
  takilanlar.sort((a, b) => ((a.sonIlerlemeAt ?? "") < (b.sonIlerlemeAt ?? "") ? -1 : 1));
  // eslint-disable-next-line react-hooks/purity
  const simdi = Date.now();

  function sessizlik(sonAt: string | null): string {
    if (!sonAt) return "—";
    const saat = Math.floor((simdi - Date.parse(sonAt)) / 3_600_000);
    if (saat < 1) return "<1sa";
    if (saat < 48) return `${saat}sa`;
    return `${Math.floor(saat / 24)}g`;
  }

  return (
    <section className="kart-3d rounded-2xl bg-midnight-card/60 p-5 shadow-xl ring-1 ring-amber-400/30 backdrop-blur">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-amber-300">
        ⏸ Onboarding&apos;de takılanlar ({takilanlar.length})
      </h2>
      <p className="mt-1 text-xs text-slate-400">
        Başlamış ama bitirmemiş. Sistem 3+ saat sessizlikte bir kez push attı (kamp
        kapalıyken); buradaki wa.me linkiyle <b>sen</b> insan dokunuşunu yaparsın —
        otomatik WhatsApp gönderimi yok.
      </p>
      <div className="mt-3 overflow-hidden rounded-xl border border-white/10">
        <table className="w-full text-sm">
          <thead className="bg-midnight-soft/60 text-xs uppercase text-slate-400">
            <tr>
              <th className="px-3 py-2 text-left">Kişi</th>
              <th className="px-3 py-2 text-left">Takıldığı adım</th>
              <th className="px-3 py-2 text-left">Son ilerleme</th>
              <th className="px-3 py-2 text-center">Push</th>
              <th className="px-3 py-2 text-right">WhatsApp</th>
            </tr>
          </thead>
          <tbody>
            {takilanlar.map((k) => {
              const ilkAd = k.ad.split(" ")[0];
              const girisLink = `${BAGLANTI_TABANI}/giris?kod=${k.loginKod}`;
              const mesaj = tr.onboardingTakip.waMesaj(ilkAd, k.eksikAdimAd, girisLink);
              return (
                <tr key={k.id} className="border-t border-white/5">
                  <td className="px-3 py-2 text-slate-200">{k.ad}</td>
                  <td className="px-3 py-2 text-amber-200">{k.eksikAdimAd}</td>
                  <td className="px-3 py-2 font-mono text-slate-400">
                    {sessizlik(k.sonIlerlemeAt)}
                  </td>
                  <td className="px-3 py-2 text-center text-slate-400">
                    {k.hatirlatildiAt ? "✓" : "—"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {k.telefon ? (
                      <a
                        href={`https://wa.me/${k.telefon.replace(/\D/g, "")}?text=${encodeURIComponent(mesaj)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-block rounded-lg bg-emerald-500/15 px-3 py-1.5 text-xs font-bold text-emerald-300 transition-colors hover:bg-emerald-500/25"
                      >
                        💬 Yaz
                      </a>
                    ) : (
                      <span className="text-xs text-slate-600">tel yok</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
