import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { raporHesapla, raporlarGorunurMu } from "@/lib/rapor";
import { hedefCekirdek } from "@/lib/hedef";
import { pusulaCekirdek } from "@/lib/pusula";
import { oyunPlaniGetir } from "@/lib/oyunPlani";
import { sozGetir, sozV2KapisiAcik } from "@/lib/soz";
import { tlFormat } from "@/lib/kariyer";
import OyunPlaniBolumu from "./OyunPlaniBolumu";
import { arketipBul } from "@/lib/arketip";
import { muhurAcikMi, donusumAdlandir } from "@/lib/muhur";
import { unvanBul } from "@/lib/kivilcim";
import { tr } from "@/lib/i18n/tr";
import Konfeti from "@/components/Konfeti";
import MuhurAcilis from "@/components/MuhurAcilis";
import KristalPortre from "./KristalPortre";
import RaporKaydet from "./RaporKaydet";
import AynaHikaye, { type Slayt } from "./AynaHikaye";
import AynaBekleme from "./AynaBekleme";
import ArketipKarti from "./ArketipKarti";
import AynaKarti from "./AynaKarti";
import KelimeKarti from "./KelimeKarti";
import MektupBolumu from "./MektupBolumu";
import SesCal from "@/components/SesCal";
import AynaSesi from "@/components/AynaSesi";

export const metadata = { title: "Ayna Raporun — Liderlik Aynası" };

function puanYaz(n: number | null): string {
  return n === null ? "—" : n.toFixed(1);
}

export default async function AynaPage() {
  const session = await getSession();
  if (!session) redirect("/giris");
  if (session.rol !== "participant") redirect("/admin");

  const db = supabaseAdmin();

  if (!(await raporlarGorunurMu(db))) {
    return <AynaBekleme />;
  }

  const rapor = await raporHesapla(db, session.sub);
  const t = tr.ayna;
  const arketip = arketipBul(rapor.satirlar);
  const ozellikAd = new Map(rapor.satirlar.map((s) => [s.ozellikId, s.ad]));
  // 3B kristal için 10 özellik dış puanı (yoksa öz), özellik sırasına göre
  const kristalDegerler = [...rapor.satirlar]
    .sort((a, b) => a.ozellikId - b.ozellikId)
    .map((s) => s.dis ?? s.oz ?? 0);

  const { count: verdigiPuan } = await db
    .from("ratings")
    .select("id", { count: "exact", head: true })
    .eq("rater_id", session.sub);

  const [{ data: mevcutMektup }, { data: sesProfili }, { data: takdirler }, muhurAcik, hedefC, oyunP, pusC, sozAcikV2, sozKaydi] =
    await Promise.all([
      db
        .from("mirror_letters")
        .select("content, voice_path")
        .eq("participant_id", session.sub)
        .maybeSingle(),
      db
        .from("voice_profiles")
        .select("soz_path, video_status, video_path, sample_path, beklenti")
        .eq("participant_id", session.sub)
        .maybeSingle(),
      db
        .from("kudos")
        .select("id, message, gonderen:participants!kudos_from_id_fkey(full_name)")
        .eq("to_id", session.sub)
        .eq("is_hidden", false)
        .order("created_at", { ascending: false }),
      muhurAcikMi(db),
      hedefCekirdek(db, session.sub),
      oyunPlaniGetir(db, session.sub),
      pusulaCekirdek(db, session.sub),
      sozV2KapisiAcik(db),
      sozGetir(db, session.sub),
    ]);

  // FAZ A Rapor v2: raporu kişinin nedenine + kariyer hedefine bağla.
  const neden = pusC?.cekirdek_neden?.[0] ?? null;
  const hedefPlan = hedefC?.plan ?? null;

  // A2 Mühür Açılışı: kamp sonu before/after. Onboarding'de mühürlenen söz
  // (kendi sesi + yazısı) açılır; "kampa ___ geldin, ___ dönüyorsun" adlandırması.
  const donusum = donusumAdlandir(rapor.satirlar);
  let muhurSesUrl: string | null = null;
  if (muhurAcik && sesProfili?.sample_path) {
    const { data: imzali } = await db.storage
      .from("sesler")
      .createSignedUrl(sesProfili.sample_path, 3600);
    muhurSesUrl = imzali?.signedUrl ?? null;
  }

  // YANSIMAN sesleri: kısa ömürlü imzalı URL'ler (özel bucket)
  let mektupSesUrl: string | null = null;
  if (mevcutMektup?.voice_path) {
    const { data: imzali } = await db.storage
      .from("sesler")
      .createSignedUrl(mevcutMektup.voice_path, 3600);
    mektupSesUrl = imzali?.signedUrl ?? null;
  }
  let sozSesUrl: string | null = null;
  if (sesProfili?.soz_path) {
    const { data: imzali } = await db.storage
      .from("sesler")
      .createSignedUrl(sesProfili.soz_path, 3600);
    sozSesUrl = imzali?.signedUrl ?? null;
  }
  // Mektup Filmi: mektup kendi sesinden okunurken suda beliren yansıma oynar
  let yansimaVideoUrl: string | null = null;
  if (sesProfili?.video_status === "hazir" && sesProfili.video_path) {
    const { data: imzali } = await db.storage
      .from("sesler")
      .createSignedUrl(sesProfili.video_path, 3600);
    yansimaVideoUrl = imzali?.signedUrl ?? null;
  }

  const tahminTuttu =
    rapor.tahmin &&
    rapor.gercekTopId !== null &&
    rapor.tahmin.topId === rapor.gercekTopId;

  // #3 Story slaytları — en kritik içgörüler (kör nokta doruk noktası)
  const slaytlar: Slayt[] = [
    {
      ikon: "👁",
      ust: t.hikayeUstAcilis,
      baslik: t.hikayeAcilis(session.ad),
      metin: t.hikayeAcilisMetin(verdigiPuan ?? 0),
      tema: "gold",
    },
  ];
  if (rapor.guclu[0])
    slaytlar.push({
      ikon: "✨",
      ust: t.gucluBaslik,
      baslik: rapor.guclu[0].ad,
      metin: t.hikayeGucluMetin,
      liste: rapor.guclu.slice(0, 3).map((s) => s.ad),
      tema: "emerald",
    });
  if (rapor.gizliGuc)
    slaytlar.push({
      ikon: "💎",
      ust: t.gizliGucBaslik,
      baslik: rapor.gizliGuc.ad,
      metin: t.hikayeGizliMetin,
      tema: "emerald",
    });
  if (rapor.korNokta)
    slaytlar.push({
      ikon: "👁",
      ust: t.korNoktaBaslik,
      baslik: rapor.korNokta.ad,
      metin: t.korNoktaAciklama(rapor.korNokta.ad),
      tema: "amber",
    });
  // UX #1: açığın kapandığı an törensel anlatının bir beat'i olsun (#5 ile bağ)
  if (rapor.korNoktaYolu?.kapandiMi)
    slaytlar.push({
      ikon: "📉",
      ust: t.daralmaBaslik,
      baslik: rapor.korNoktaYolu.ad,
      metin: t.daralmaKapandi,
      tema: "royal",
    });
  slaytlar.push({
    ikon: arketip.simge,
    ust: tr.arketip.raporBaslik,
    baslik: arketip.ad,
    metin: arketip.ozet,
    tema: "gold",
  });
  if (rapor.enGelisen)
    slaytlar.push({
      ikon: "🚀",
      ust: t.hikayeBaslik,
      baslik: t.hikayeYolculukBaslik,
      metin: t.hikayeGelisen(rapor.enGelisen.ad, rapor.enGelisen.fark.toFixed(1)),
      tema: "royal",
    });
  if ((takdirler ?? []).length > 0)
    slaytlar.push({
      ikon: "💛",
      ust: tr.takdir.gelenlerBaslik,
      baslik: t.hikayeTakdirBaslik((takdirler ?? []).length),
      metin: `“${takdirler![0].message}”`,
      tema: "gold",
    });
  slaytlar.push({
    ikon: "🌟",
    ust: "",
    baslik: t.hikayeKapanis,
    metin: t.hikayeKapanisMetin,
    tema: "gold",
  });

  // #4 Ayna Filmi — kutlama/yolculuk odaklı (başarı), paylaşılabilir kapanış
  const filmSlaytlar: Slayt[] = [
    {
      ikon: "🎬",
      ust: t.filmUst,
      baslik: t.filmAcilis(session.ad),
      metin: t.filmAcilisMetin,
      tema: "gold",
    },
  ];
  if (rapor.gorev.tamamlanan > 0)
    filmSlaytlar.push({
      ikon: "🎯",
      ust: t.filmGorevUst,
      baslik: t.filmGorev(rapor.gorev.tamamlanan),
      metin: t.filmGorevMetin,
      tema: "emerald",
    });
  filmSlaytlar.push({
    ikon: "⚡",
    ust: t.filmKivilcimUst,
    baslik: t.filmKivilcim(rapor.gorev.kivilcim),
    metin: t.filmKivilcimMetin(unvanBul(rapor.gorev.kivilcim).mevcut.ad),
    tema: "gold",
  });
  if ((takdirler ?? []).length > 0)
    filmSlaytlar.push({
      ikon: "💛",
      ust: t.filmTakdirUst,
      baslik: t.filmTakdir((takdirler ?? []).length),
      metin: t.filmTakdirMetin,
      tema: "gold",
    });
  filmSlaytlar.push({
    ikon: arketip.simge,
    ust: t.filmKimlikUst,
    baslik: arketip.ad,
    metin: t.filmKimlikMetin,
    tema: "royal",
  });
  filmSlaytlar.push({
    ikon: "🌟",
    ust: "",
    baslik: t.filmKapanis,
    metin: t.filmKapanisMetin,
    tema: "gold",
  });

  return (
    <main className="flex min-h-dvh flex-col overflow-x-hidden overflow-y-auto">
      <MuhurAcilis
        aktif={muhurAcik}
        sesUrl={muhurSesUrl}
        beklenti={sesProfili?.beklenti ?? null}
        gelis={donusum.gelis.ad}
        donus={donusum.donus.ad}
        ayni={donusum.ayni}
      />
      <Konfeti anahtar="kutlama-ayna" />
      <div className="yazdirilabilir sahne-giris mx-auto my-auto w-full max-w-md space-y-6 p-5">
      <header className="ayna-acilis text-center">
        <p className="prizma-serif text-xs uppercase tracking-[0.45em] text-slate-400">
          {t.baslik}
        </p>
        <h1 className="prizma-serif ay-metin mt-2 text-3xl font-semibold">
          {t.acilis(session.ad)}
        </h1>
        <p className="mt-2 text-sm text-slate-300">{t.acilisAlt}</p>
        <p className="mt-2 text-sm font-semibold text-gold-light">
          {t.epikKatki(verdigiPuan ?? 0)}
        </p>
        <div className="yazdir-gizle mt-4 text-left">
          <AynaSesi kod="raporAcilis" />
        </div>
        <div className="mt-2">
          <RaporKaydet />
        </div>
        <div className="yazdir-gizle mt-3">
          <AynaHikaye
            slaytlar={slaytlar}
            otomatikAnahtar={`ayna-sinema-${session.sub}`}
            muhurAktif={muhurAcik}
          />
        </div>
      </header>

      {/* S7: Rapor Haritası kaldırıldı; tek "başla" linki yeterli */}
      <div className="yazdir-gizle text-center">
        <a href="#r-guclu" className="inline-block rounded-full bg-gold/20 px-4 py-1.5 text-sm font-semibold text-gold-light transition-colors hover:bg-gold/30">
          ↓ {t.haritaBasla}
        </a>
      </div>

      {/* C1 Güven: çok az kişi puanladıysa, dış algı ortalaması istatistik olarak
          zayıf — bunu dürüstçe belirt ki sınırlı veri otoriter gerçek sanılmasın. */}
      {rapor.dusukGuven && (
        <p className="rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-center text-sm font-medium text-amber-200">
          {t.dusukGuven(rapor.degerlendirenSayisi)}
        </p>
      )}

      {/* FAZ A Rapor v2: NEDEN + HEDEF — aynayı kişinin nedenine ve hedefine
          bağlar. Rapor artık "başkaları seni nasıl gördü" değil, "bu seni
          hedefine nasıl taşır" hikâyesidir. */}
      {(neden || hedefPlan) && (
        <section className="kart-cam rounded-2xl bg-gradient-to-br from-gold/10 to-midnight-card/60 p-5 shadow-xl ring-1 ring-gold/30 backdrop-blur">
          <h2 className="font-semibold text-gold-light">{t.nedenHedefBaslik}</h2>
          {neden && (
            <div className="mt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t.nedenEtiket}
              </p>
              <p className="mt-1 text-base italic leading-relaxed text-slate-100">“{neden}”</p>
            </div>
          )}
          {hedefPlan && (
            <div className="mt-4 rounded-xl bg-emerald-500/10 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300/80">
                {t.hedefEtiket}
              </p>
              <p className="mt-1 text-base font-bold text-emerald-200">
                {t.hedefBilgi(
                  hedefPlan.rutbe,
                  tlFormat(hedefPlan.gelir, hedefPlan.gelirArti),
                  hedefPlan.sureAy
                )}
              </p>
            </div>
          )}
          <p className="mt-3 text-sm leading-relaxed text-slate-400">{t.nedenHedefKopru}</p>
        </section>
      )}

      {/* Güçlü yanlar / gelişim alanları */}
      <section id="r-guclu" className="grid scroll-mt-4 grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="kart-cam rounded-2xl p-5 shadow-xl ring-1 ring-gold/30 backdrop-blur">
          <h2 className="font-semibold text-gold-light">{t.gucluBaslik}</h2>
          {rapor.guclu.length === 0 ? (
            <p className="mt-2 text-sm text-slate-400">{t.veriYok}</p>
          ) : (
            <ol className="mt-3 space-y-2">
              {rapor.guclu.map((s, i) => (
                <li key={s.ozellikId} className="flex items-baseline justify-between">
                  <span className="text-sm font-medium text-slate-100">
                    {i + 1}. {s.ad}
                  </span>
                  <span className="font-mono text-sm font-bold text-emerald-400">
                    {puanYaz(s.dis)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
        <div className="kart-cam rounded-2xl p-5 shadow-xl ring-1 ring-royal/30 backdrop-blur">
          <h2 className="font-semibold text-gold-light">{t.gelisimBaslik}</h2>
          {rapor.gelisim.length === 0 ? (
            <p className="mt-2 text-sm text-slate-400">{t.veriYok}</p>
          ) : (
            <ol className="mt-3 space-y-2">
              {rapor.gelisim.map((s) => (
                <li key={s.ozellikId} className="flex items-baseline justify-between">
                  <span className="text-sm font-medium text-slate-100">{s.ad}</span>
                  <span className="font-mono text-sm font-bold text-amber-400">
                    {puanYaz(s.dis)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>

      {/* Liderlik Arketibi: 10 özellikten kimlik + paylaşılabilir kart */}
      <section className="kart-cam relative overflow-hidden rounded-2xl bg-gradient-to-br from-gold/10 to-midnight-card/60 p-5 shadow-xl ring-1 ring-gold/30 backdrop-blur">
        <h2 className="font-semibold text-gold-light">{tr.arketip.raporBaslik}</h2>
        <p className="mt-1 text-xs text-slate-400">{tr.arketip.raporAciklama}</p>
        <div className="mt-3 text-center">
          <p className="text-6xl">{arketip.simge}</p>
          <p className="prizma-serif ay-metin mt-2 text-3xl font-semibold leading-tight">
            {arketip.ad}
          </p>
          <p className="mx-auto mt-3 max-w-sm text-base leading-relaxed text-slate-200">
            {arketip.ozet}
          </p>
        </div>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="rounded-xl bg-white/[0.04] p-3">
            <dt className="text-xs font-semibold uppercase tracking-wide text-emerald-300">
              {tr.arketip.superGucEtiket}
            </dt>
            <dd className="mt-0.5 text-slate-100">{arketip.superGuc}</dd>
          </div>
          <div className="rounded-xl bg-white/[0.04] p-3">
            <dt className="text-xs font-semibold uppercase tracking-wide text-amber-300">
              {tr.arketip.buyurkenEtiket}
            </dt>
            <dd className="mt-0.5 text-slate-100">{arketip.buyurken}</dd>
          </div>
        </dl>
        <div className="yazdir-gizle mt-4">
          <p className="text-xs text-slate-400">{tr.arketip.kartAciklama}</p>
          <ArketipKarti
            ad={session.ad}
            arketipAd={arketip.ad}
            simge={arketip.simge}
            ozet={arketip.ozet}
          />
        </div>
      </section>

      {/* 3B veri portresi: döndürülebilir liderlik kristali */}
      <section className="kart-cam relative overflow-hidden rounded-2xl bg-gradient-to-br from-royal/15 to-midnight-card/60 p-5 shadow-xl ring-1 ring-royal-light/30 backdrop-blur">
        <h2 className="font-semibold text-gold-light">{t.kristalBaslik}</h2>
        <p className="mt-1 text-xs text-slate-400">{t.kristalAciklama}</p>
        <div className="mt-3">
          <KristalPortre degerler={kristalDegerler} />
        </div>
      </section>

      {/* Johari: gizli güç / kör nokta */}
      {rapor.gizliGuc && (
        <section className="kart-cam rounded-2xl bg-gradient-to-br from-emerald-500/15 to-midnight-card/60 p-5 shadow-xl ring-1 ring-emerald-400/30 backdrop-blur">
          <h2 className="font-semibold text-emerald-400">{t.gizliGucBaslik}</h2>
          <p className="mt-2 text-sm text-slate-200">
            {t.gizliGucAciklama(rapor.gizliGuc.ad)}
          </p>
        </section>
      )}
      {rapor.korNokta && (
        <section className="kart-cam rounded-2xl bg-gradient-to-br from-amber-500/15 to-midnight-card/60 p-5 shadow-xl ring-1 ring-amber-400/30 backdrop-blur">
          <h2 className="font-semibold text-amber-400">{t.korNoktaBaslik}</h2>
          <p className="mt-2 text-sm text-slate-200">
            {t.korNoktaAciklama(rapor.korNokta.ad)}
          </p>
        </section>
      )}

      {/* #5 Kör nokta daralması: açığın dalga-dalga kapanışı */}
      {rapor.korNoktaYolu && rapor.korNoktaYolu.adimlar.length >= 2 && (
        <section className="kart-cam rounded-2xl bg-gradient-to-br from-royal/15 to-midnight-card/60 p-5 shadow-xl ring-1 ring-royal-light/30 backdrop-blur">
          <h2 className="font-semibold text-royal-light">{t.daralmaBaslik}</h2>
          <p className="mt-1 text-sm text-slate-300">
            {t.daralmaAciklama(rapor.korNoktaYolu.ad, rapor.korNoktaYolu.oz.toFixed(1))}
          </p>
          <ul className="mt-4 space-y-2.5">
            {rapor.korNoktaYolu.adimlar.map((a) => {
              const yuzde = Math.min(100, (a.fark / 9) * 100);
              return (
                <li key={a.dalga} className="flex items-center gap-3">
                  <span className="w-20 shrink-0 text-xs text-slate-400">{a.dalgaAd}</span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-400/70 to-royal-light/70"
                      style={{ width: `${Math.max(4, yuzde)}%` }}
                    />
                  </div>
                  <span className="w-16 shrink-0 text-right text-xs font-semibold text-slate-200">
                    {t.daralmaAcik(a.fark.toFixed(1))}
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-sm font-medium text-royal-light">
            {rapor.korNoktaYolu.kapandiMi ? t.daralmaKapandi : t.daralmaDevam}
          </p>
        </section>
      )}

      {/* Tahmin vs gerçek */}
      <section className="kart-cam rounded-2xl p-5 shadow-xl ring-1 ring-gold/30 backdrop-blur">
        <h2 className="font-semibold text-gold-light">{t.tahminBaslik}</h2>
        {!rapor.tahmin ? (
          <p className="mt-2 text-sm text-slate-400">{t.tahminYok}</p>
        ) : (
          <>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-midnight-soft p-3">
                <p className="text-xs text-slate-400">
                  ▲ {t.tahminEnYuksek} — {t.tahminSenin}
                </p>
                <p className="mt-1 font-medium text-slate-100">
                  {ozellikAd.get(rapor.tahmin.topId)}
                </p>
                <p className="mt-2 text-xs text-slate-400">{t.tahminGercek}</p>
                <p className="font-medium text-emerald-400">
                  {rapor.gercekTopId !== null ? ozellikAd.get(rapor.gercekTopId) : "—"}
                </p>
              </div>
              <div className="rounded-xl bg-midnight-soft p-3">
                <p className="text-xs text-slate-400">
                  ▼ {t.tahminEnDusuk} — {t.tahminSenin}
                </p>
                <p className="mt-1 font-medium text-slate-100">
                  {ozellikAd.get(rapor.tahmin.bottomId)}
                </p>
                <p className="mt-2 text-xs text-slate-400">{t.tahminGercek}</p>
                <p className="font-medium text-amber-400">
                  {rapor.gercekBottomId !== null
                    ? ozellikAd.get(rapor.gercekBottomId)
                    : "—"}
                </p>
              </div>
            </div>
            {/* Dış puan yokken "gerçek" oluşmaz; hüküm verme */}
            {rapor.gercekTopId !== null && (
              <p className="mt-3 text-center text-sm font-medium text-gold-light">
                {tahminTuttu ? t.tahminTuttu : t.tahminTutmadi}
              </p>
            )}
          </>
        )}
      </section>

      {/* Dalga yolculuğu — hikâye modu */}
      <section id="r-yolculuk" className="kart-cam scroll-mt-4 rounded-2xl p-5 shadow-xl ring-1 ring-royal/30 backdrop-blur">
        <h2 className="font-semibold text-gold-light">{t.hikayeBaslik}</h2>
        <p className="mt-1 text-xs text-slate-400">{t.hikayeAciklama}</p>
        {rapor.dalgalar.length === 0 ? (
          <p className="mt-3 text-sm text-slate-400">{t.veriYok}</p>
        ) : (
          <>
            {/* Gel #9 — kümülatif trend: ilk→son dalga genel algı yönü.
                Puanlar her dalgada sıfırlanır; bu satır toplam yolculuğu
                tek bakışta gösterir (yükseldin/sabit/dalgalandı). */}
            {(() => {
              const ilk = rapor.dalgalar[0]?.genelOrtalama;
              const son = rapor.dalgalar[rapor.dalgalar.length - 1]?.genelOrtalama;
              if (rapor.dalgalar.length < 2 || ilk == null || son == null) return null;
              const fark = Number((son - ilk).toFixed(1));
              const yon = fark > 0.2 ? "yukari" : fark < -0.2 ? "asagi" : "sabit";
              const ikon = yon === "yukari" ? "📈" : yon === "asagi" ? "📉" : "➡️";
              const renk =
                yon === "yukari"
                  ? "bg-emerald-500/10 text-emerald-200"
                  : yon === "asagi"
                    ? "bg-amber-500/10 text-amber-200"
                    : "bg-white/[0.04] text-slate-300";
              return (
                <p className={`mt-3 rounded-xl px-4 py-2.5 text-sm font-medium ${renk}`}>
                  {ikon}{" "}
                  {t.trendOzet(
                    rapor.dalgalar.length,
                    puanYaz(ilk),
                    puanYaz(son),
                    yon,
                    Math.abs(fark).toFixed(1)
                  )}
                </p>
              );
            })()}
            <ol className="relative mt-4 space-y-4 border-l border-royal/40 pl-5">
              {rapor.dalgalar.map((d) => (
                <li key={d.dalgaId} className="relative">
                  <span className="absolute -left-[26px] top-1 h-3 w-3 rounded-full bg-gold" />
                  <p className="text-sm font-medium text-slate-100">{d.ad}</p>
                  <p className="text-xs text-slate-400">
                    {t.hikayeDalgaOzet(puanYaz(d.genelOrtalama))}
                  </p>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-midnight-soft">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-royal to-gold"
                      style={{ width: `${((d.genelOrtalama ?? 0) / 10) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ol>
            {rapor.enGelisen && (
              <p className="mt-4 rounded-xl bg-gold/10 p-3 text-sm text-gold-light">
                🚀 {t.hikayeGelisen(rapor.enGelisen.ad, rapor.enGelisen.fark.toFixed(1))}
              </p>
            )}
          </>
        )}
      </section>

      {/* Özellik özellik öz vs dış */}
      <section id="r-tablo" className="kart-cam scroll-mt-4 rounded-2xl p-5 shadow-xl ring-1 ring-royal/30 backdrop-blur">
        <h2 className="font-semibold text-gold-light">{t.tabloBaslik}</h2>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
          <span>
            <span className="mr-1 inline-block h-2 w-4 rounded-sm bg-royal-light" />
            {t.ozEtiket}
          </span>
          <span>
            <span className="mr-1 inline-block h-2 w-4 rounded-sm bg-gold" />
            {t.disEtiket}
          </span>
          {rapor.satirlar.some((s) => s.ayna !== null) && (
            <span>
              <span className="mr-1 inline-block h-2 w-4 rounded-sm bg-emerald-400" />
              {t.aynaEtiket}
            </span>
          )}
        </div>
        <ul className="mt-4 space-y-4">
          {rapor.satirlar.map((s) => (
            <li key={s.ozellikId}>
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-medium text-slate-100">{s.ad}</span>
                <span className="text-xs text-slate-500">
                  {s.disSayi > 0 ? t.kisiSayisi(s.disSayi) : t.veriYok}
                </span>
              </div>
              <div className="mt-1.5 space-y-1">
                <div className="h-2 w-full overflow-hidden rounded-full bg-midnight-soft">
                  <div
                    className="h-full rounded-full bg-royal-light"
                    style={{ width: `${((s.oz ?? 0) / 10) * 100}%` }}
                  />
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-midnight-soft">
                  <div
                    className="h-full rounded-full bg-gold"
                    style={{ width: `${((s.dis ?? 0) / 10) * 100}%` }}
                  />
                </div>
                {s.ayna !== null && (
                  <div className="h-2 w-full overflow-hidden rounded-full bg-midnight-soft">
                    <div
                      className="h-full rounded-full bg-emerald-400"
                      style={{ width: `${(s.ayna / 10) * 100}%` }}
                    />
                  </div>
                )}
              </div>
              <div className="mt-1 flex justify-between font-mono text-xs text-slate-400">
                <span>{puanYaz(s.oz)}</span>
                <span>
                  {puanYaz(s.dis)}
                  {s.ayna !== null && (
                    <span className="ml-2 text-emerald-400">{puanYaz(s.ayna)}</span>
                  )}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Yorumlar */}
      <section className="kart-cam rounded-2xl p-5 shadow-xl ring-1 ring-royal/30 backdrop-blur">
        <h2 className="font-semibold text-gold-light">{t.yorumlarBaslik}</h2>
        <p className="mt-1 text-xs text-slate-400">{t.yorumlarAciklama}</p>
        {rapor.yorumlar.length === 0 ? (
          <p className="mt-3 text-sm text-slate-400">{t.yorumYok}</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {rapor.yorumlar.map((y, i) => (
              <li key={i} className="rounded-xl bg-midnight-soft p-3">
                <p className="text-xs text-slate-400">
                  Dalga {y.dalga} · {y.ozellikAd} · {y.puan}/10
                </p>
                <p className="mt-1 text-sm text-slate-100">“{y.yorum}”</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Sana gelen takdirler — isimli, olumlu notlar */}
      {(takdirler ?? []).length > 0 && (
        <section className="kart-cam rounded-2xl bg-gradient-to-br from-gold/10 to-midnight-card/60 p-5 shadow-xl ring-1 ring-gold/30 backdrop-blur">
          <h2 className="font-semibold text-gold-light">{tr.takdir.gelenlerBaslik}</h2>
          <ul className="mt-3 space-y-3">
            {(takdirler ?? []).map((g) => (
              <li key={g.id} className="rounded-xl bg-white/[0.04] p-3">
                <p className="text-sm leading-relaxed text-slate-100">“{g.message}”</p>
                <p className="mt-1.5 text-xs font-semibold text-gold-light">
                  {tr.takdir.kimden(g.gonderen?.full_name ?? "Bir arkadaşın")}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* AYNA'nın görev özeti */}
      {rapor.gorev.tamamlanan > 0 && (
        <section className="kart-cam rounded-2xl bg-gradient-to-br from-emerald-500/10 to-midnight-card/60 p-5 shadow-xl ring-1 ring-emerald-400/30 backdrop-blur">
          <h2 className="font-semibold text-emerald-400">{t.aynaBaslik}</h2>
          <p className="mt-2 text-sm text-slate-200">
            {t.aynaOzeti(
              rapor.gorev.tamamlanan,
              rapor.gorev.kivilcim,
              unvanBul(rapor.gorev.kivilcim).mevcut.ad
            )}
          </p>
        </section>
      )}

      {/* Kelime kartı */}
      {rapor.guclu[0] && (
        <KelimeKarti ad={session.ad} ozellik={rapor.guclu[0].ad} />
      )}

      {/* FAZ A Rapor v2: 10/40/90 gün oyun planı — hedefe + nedene + aynaya göre */}
      <div id="r-plan" className="scroll-mt-4">
        <OyunPlaniBolumu mevcutPlan={oyunP} />
      </div>

      {/* AI Ayna Mektubu — varsa Mektup Filmi olarak (video + kendi sesi) */}
      <div id="r-mektup" className="scroll-mt-4">
        <MektupBolumu
          mevcutMektup={mevcutMektup?.content ?? null}
          sesUrl={mektupSesUrl}
          videoUrl={yansimaVideoUrl}
        />
      </div>

      {sozSesUrl && (
        <section className="kart-cam relative overflow-hidden rounded-2xl p-5">
          <h2 className="font-semibold text-gold-light">{tr.soz.baslik}</h2>
          <p className="mt-1 text-xs text-slate-400">{tr.soz.aciklama}</p>
          <SesCal url={sozSesUrl} etiket={tr.soz.dinle} />
        </section>
      )}

      {/* #4 Ayna Filmi — kutlama kapanışı */}
      <section className="yazdir-gizle kart-cam rounded-2xl bg-gradient-to-br from-gold/10 to-midnight-card/60 p-5 text-center shadow-xl ring-1 ring-gold/30 backdrop-blur">
        <h2 className="font-semibold text-gold-light">{t.filmBaslik}</h2>
        <p className="mt-1 text-xs text-slate-400">{t.filmAciklama}</p>
        <div className="mt-3">
          <AynaHikaye slaytlar={filmSlaytlar} etiket={`🎬 ${t.filmIzle}`} />
        </div>
      </section>

      {/* #10 Ayna Kartı — kapanış özeti: arketip + en güçlü 3 + en gelişen */}
      {rapor.guclu.length > 0 && (
        <section className="yazdir-gizle kart-cam rounded-2xl bg-gradient-to-br from-gold/10 to-midnight-card/60 p-5 shadow-xl ring-1 ring-gold/30 backdrop-blur">
          <h2 className="font-semibold text-gold-light">{tr.aynaKarti.baslik}</h2>
          <p className="mt-1 text-xs text-slate-400">{tr.aynaKarti.aciklama}</p>
          <AynaKarti
            ad={session.ad}
            arketipAd={arketip.ad}
            simge={arketip.simge}
            guclu={rapor.guclu.map((s) => s.ad)}
            gelisen={rapor.enGelisen?.ad ?? null}
          />
        </section>
      )}

      {/* FAZ A Söz v2: raporu gördükten SONRA kapanış sözü — en güçlü an */}
      {sozAcikV2 && sozKaydi?.durum !== "sesli" && (
        <section className="yazdir-gizle kart-cerceve rounded-2xl bg-gradient-to-br from-gold/15 to-midnight-card/60 p-6 text-center shadow-xl ring-1 ring-gold/40 backdrop-blur">
          <p className="text-4xl">📜</p>
          <h2 className="prizma-serif ay-metin mt-2 text-xl font-semibold">{tr.sozV2.sekilBaslik}</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">{tr.sozV2.sekilMetin}</p>
          <Link
            href="/sozum"
            className="btn-kor parilti mt-5 inline-flex h-12 w-full items-center justify-center rounded-2xl text-base font-bold"
          >
            {tr.sozV2.sekillendir}
          </Link>
        </section>
      )}

      <p className="yazdir-gizle pb-4 text-center">
        <Link
          href="/"
          className="text-sm text-slate-400 underline-offset-4 hover:text-slate-200 hover:underline"
        >
          ← {tr.degerlendir.anaSayfayaDon}
        </Link>
      </p>
      </div>
    </main>
  );
}
