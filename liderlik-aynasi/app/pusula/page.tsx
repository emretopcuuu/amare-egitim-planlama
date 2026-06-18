import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { pusulaDurum, pusulaGecmis } from "@/lib/pusula";
import { aktifOzellikler, ozPuanTamamMi } from "@/lib/degerlendirme";
import { tr } from "@/lib/i18n/tr";
import PusulaSohbet from "./PusulaSohbet";
import HazirlikAkis from "./HazirlikAkis";
import ProfilFoto from "@/components/ProfilFoto";
import CanliAyna from "@/components/CanliAyna";
import GeriSayim from "@/components/GeriSayim";
import Konfeti from "@/components/Konfeti";
import AynaKurulum from "@/components/AynaKurulum";

const t = tr.pusula;

// FAZ 0 — Nedenler çalışması + kamp öncesi hazırlık hub'ı. Pusula bitince kişi
// (hepsi opsiyonel) kendini puanlar, profil fotoğrafı + Canlı Ayna ekler, kamp
// rehberine bakar — sonra "kampta görüşürüz" beklemesi.
export default async function PusulaSayfa() {
  const session = await getSession();
  if (!session) redirect("/giris");
  if (session.rol !== "participant") redirect("/");

  const db = supabaseAdmin();
  const [durum, gecmis, { data: kisi }, { data: pus }] = await Promise.all([
    pusulaDurum(db, session.sub),
    pusulaGecmis(db, session.sub),
    db
      .from("participants")
      .select("consent_at, profil_foto_path, yuz_fotolari")
      .eq("id", session.sub)
      .maybeSingle(),
    db.from("pusula").select("oncelikler").eq("participant_id", session.sub).maybeSingle(),
  ]);

  const oncelikler = ((pus?.oncelikler as { sira: number; metin: string }[]) ?? [])
    .slice()
    .sort((a, b) => a.sira - b.sira)
    .map((o) => o.metin);

  if (durum.tamam) {
    const [ozellikler, { data: kampAyar }] = await Promise.all([
      aktifOzellikler(db),
      db.from("settings").select("value").eq("key", "kamp_tarihi").maybeSingle(),
    ]);
    const ozTamam = await ozPuanTamamMi(db, session.sub, 1, ozellikler.length);
    const selfieVar = !!kisi?.profil_foto_path;
    const yuzVar = Array.isArray(kisi?.yuz_fotolari) && (kisi.yuz_fotolari as unknown[]).length > 0;
    const kampTarihi = kampAyar?.value ?? null;

    const adimlar = [
      {
        k: "ozpuan",
        ikon: "⭐",
        baslik: t.adimPuanBaslik,
        metin: t.adimPuanMetin,
        tamam: ozTamam,
        aksiyon: (
          <Link
            href={`/degerlendir/${session.sub}`}
            className="btn-kor flex h-12 w-full items-center justify-center rounded-xl text-sm font-bold"
          >
            {ozTamam ? t.adimPuanDuzelt : t.adimPuanDugme}
          </Link>
        ),
      },
      {
        k: "selfie",
        ikon: "📸",
        baslik: t.adimFotoBaslik,
        metin: t.adimFotoMetin,
        tamam: selfieVar,
        aksiyon: <ProfilFoto varMi={selfieVar} />,
      },
      {
        k: "yuz",
        ikon: "🔮",
        baslik: t.adimYuzBaslik,
        metin: t.adimYuzMetin,
        tamam: yuzVar,
        aksiyon: <CanliAyna varMi={yuzVar} />,
      },
    ];
    const hepsiTamam = adimlar.every((a) => a.tamam);

    // Sakin dinlenme/bekleme ekranı — hamleler bitince (ya da geçilince) çıkar.
    // EN BÜYÜK mesaj: "mührü kaldırmadan devam edemezsin" (kampta QR okut).
    // Aday bundan sonra nasıl ilerleyeceğini buradan anlar; gerisi etrafında.
    const bekleIcerik = (
      <div className="space-y-5">
        {hepsiTamam && <Konfeti anahtar="hazirlik-tamam" />}

        {/* HERO — mühür kilidi: ekranın merkez, en baskın öğesi */}
        <div className="relative overflow-hidden rounded-3xl border-2 border-gold/45 bg-gradient-to-b from-gold/12 to-midnight-card/70 p-7 text-center shadow-xl">
          <span className="altin-tel" />
          <p className="text-6xl leading-none" aria-hidden>
            🔒
          </p>
          <p className="mt-4 inline-block rounded-full bg-gold/15 px-3 py-1 text-[0.7rem] font-bold uppercase tracking-wide text-gold-light">
            {t.muhurRozet}
          </p>
          <h1 className="prizma-serif ay-metin mt-3 text-2xl font-bold leading-snug">
            {t.muhurHeroBaslik}
          </h1>
          <p className="mx-auto mt-3 max-w-sm text-base leading-relaxed text-slate-300">
            {t.muhurHeroMetin}
          </p>
          <p className="mt-4 text-sm font-semibold text-gold-light">{t.muhurHeroNot}</p>
          {kampTarihi && <GeriSayim hedefZaman={kampTarihi} etiket={t.kampaKalan} />}
        </div>

        {/* Kampta seni neler bekliyor — merak tohumu */}
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
          <p className="mb-2.5 text-[0.7rem] font-semibold uppercase tracking-wide text-slate-500">
            ✨ {t.kilitBaslik}
          </p>
          <div className="space-y-2">
            {[t.kilit1, t.kilit2, t.kilit3].map((m) => (
              <div key={m} className="flex items-center gap-3 rounded-xl bg-black/20 px-3 py-2.5">
                <span className="text-base" aria-hidden>
                  🔒
                </span>
                <span className="flex-1 text-sm text-slate-400">{m}</span>
                <span className="shrink-0 text-[0.6rem] uppercase tracking-wide text-slate-600">
                  {t.kilitNot}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Bildirim izni — hatırlatmaların çalışması için */}
        <div className="rounded-2xl bg-midnight-card/40 p-4 ring-1 ring-royal/20">
          <p className="mb-2 text-sm font-semibold text-slate-200">🔔 {t.bildirimBaslik}</p>
          <AynaKurulum />
        </div>

        {/* Kamp rehberi — bilgi */}
        <Link
          href="/hosgeldin"
          className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 transition-colors hover:border-royal-light/40"
        >
          <span aria-hidden>📖</span>
          <span className="flex-1 text-sm text-slate-300">{t.adimRehberMetin}</span>
          <span className="text-sm font-semibold text-gold-light">{t.adimRehberDugme} →</span>
        </Link>
      </div>
    );

    return (
      <main className="flex min-h-dvh flex-col overflow-y-auto">
        <div className="mx-auto my-auto w-full max-w-md px-5 py-8">
          <HazirlikAkis adimlar={adimlar} bekleIcerik={bekleIcerik} />
        </div>
      </main>
    );
  }

  return (
    <PusulaSohbet
      baslangic={gecmis}
      rizaVar={!!kisi?.consent_at}
      onceliklerVar={durum.onceliklerVar}
      oncelikler={oncelikler}
      asamaBaslangic={durum.asama}
    />
  );
}
