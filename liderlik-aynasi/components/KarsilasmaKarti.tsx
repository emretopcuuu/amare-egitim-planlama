import { tr } from "@/lib/i18n/tr";
import KisiKarti, { type KisiKartiVeri } from "@/components/KisiKarti";

const t = tr.karsilasma;

// KARŞILAŞMA kartı — AYNA'nın eşlediği tamamlayıcı kişiyle gerçek bir konuşma
// daveti. İkincil, sade (görev+program birincil kalır). Kör nokta içeriği YOK;
// yalnız partnerin adı + sıcak davet. Partner adı zaten kampta herkese görünür.
// D7 — partner verisi geldiyse dokunulabilir kişi kartı: avatar + isim + takım,
// dokununca tam ekran + WhatsApp köprüsü (telefon yalnız bu eşleşme için gelir).
export default function KarsilasmaKarti({
  partnerAd,
  partner,
}: {
  partnerAd: string;
  partner?: KisiKartiVeri | null;
}) {
  const ad = partnerAd.replace("Sim · ", "").split(" ")[0];
  return (
    <section className="relative overflow-hidden rounded-2xl border border-gold/25 bg-gradient-to-br from-gold/[0.1] to-midnight-card/50 p-4">
      <div className="flex items-center gap-2">
        <span className="text-base" aria-hidden>🤝</span>
        <h2 className="text-sm font-semibold text-slate-100">{t.baslik}</h2>
      </div>
      <p className="mt-1.5 text-sm leading-relaxed text-slate-200">{t.metin(ad)}</p>
      {partner && (
        <div className="mt-2.5">
          <KisiKarti {...partner} />
        </div>
      )}
      <p className="mt-2 text-[0.7rem] text-slate-500">{t.not}</p>
    </section>
  );
}
