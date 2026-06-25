import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { aktifOzellikler } from "@/lib/degerlendirme";
import { raporlarGorunurMu } from "@/lib/rapor";
import { adminOnerisi } from "@/lib/adminAsistan";
import { adminUyarilari } from "@/lib/adminUyarilar";
import { canliPano } from "@/lib/canliPano";
import { funnelMetrikleri } from "@/lib/funnel";
import { tr } from "@/lib/i18n/tr";
import { kampGunu, KAMP_GUNLERI } from "@/lib/kampProgrami";
import FunnelOmurga from "./FunnelOmurga";
import DalgaKontrol from "./DalgaKontrol";
import AynaAniKontrol from "./AynaAniKontrol";
import EksikDurt from "./EksikDurt";
import OtoYenile from "./OtoYenile";
import GununAkisi from "./GununAkisi";
import HazirlikPaneli from "./HazirlikPaneli";
import CanliOzet from "./CanliOzet";
import Uyarilar from "./Uyarilar";
import Ipucu from "./Ipucu";
import TopluEylem from "./TopluEylem";
import AltAksiyonCubugu from "./AltAksiyonCubugu";
import FazSifirKontrol from "./FazSifirKontrol";
import BoslukKontrol from "./BoslukKontrol";
import OnFarkindalikKontrol from "./OnFarkindalikKontrol";
import HedefKontrol from "./HedefKontrol";
import MuhurKontrol from "./MuhurKontrol";
import SozV2Kontrol from "./SozV2Kontrol";
import SonEylemler from "./SonEylemler";
import CanliPano from "./CanliPano";
import FunnelMetrik from "./FunnelMetrik";
import TriyajKart from "./TriyajKart";
import BolumAtla from "./BolumAtla";
import CapaAcici from "./CapaAcici";
import TerimlerSozluk from "./TerimlerSozluk";
import SimdiSonra from "./SimdiSonra";
import OneriButonu from "./OneriButonu";
import BasitEylem from "./BasitEylem";
import BasitIlkIpucu from "./BasitIlkIpucu";
import Link from "next/link";

export const metadata = { title: "Yönetim Paneli — Liderlik Aynası" };

export default async function AdminPanel() {
  const session = await getSession();
  if (!session || (session.rol !== "admin" && session.rol !== "yardimci")) {
    redirect("/admin/giris");
  }
  // Yardımcı görevli: yalnız izleme + hatırlatma. Kritik anahtarlar gizli +
  // ilgili API'ler reddeder (derinlemesine savunma).
  const tamYetki = session.rol === "admin";

  const db = supabaseAdmin();
  const [
    { data: dalgalar, error: dalgaHatasi },
    ozellikler,
    raporlarAcik,
    { count: katilimciSayisi },
    { count: mektupSayisi },
    { data: silmeTalepleri },
    { data: sozAyar },
    { count: bekleyenFoto },
    { count: kayanSayi },
    { data: funnelAyarlar },
  ] = await Promise.all([
    db.from("waves").select("id, name, is_open, opened_at").order("id"),
    aktifOzellikler(db),
    raporlarGorunurMu(db),
    db
      .from("participants")
      .select("id", { count: "exact", head: true })
      .eq("role", "participant"),
    db.from("mirror_letters").select("participant_id", { count: "exact", head: true }),
    db
      .from("participants")
      .select("id, full_name, team, deletion_requested_at")
      .not("deletion_requested_at", "is", null)
      .order("deletion_requested_at"),
    db.from("settings").select("value").eq("key", "kapanis_soz_acik").maybeSingle(),
    db
      .from("photos")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    // #4 Erken uyarı: sessizleşen (dürtülmüş) aday sayısı
    db
      .from("churn_radar")
      .select("participant_id", { count: "exact", head: true })
      .not("nudged_at", "is", null),
    // Funnel omurgası: aşama hesabı + aşama açılış zaman damgaları (#15)
    db
      .from("settings")
      .select("key, value, updated_at")
      .in("key", ["pusula_acik", "muhur_acik", "reports_visible", "on_farkindalik_acik"]),
  ]);
  if (dalgaHatasi) throw dalgaHatasi;

  const sozAcik = sozAyar?.value === "true";

  const acikDalga = dalgalar.find((d) => d.is_open) ?? null;

  // İlerleme yalnızca açık dalga için hesaplanır (kamp anlık tek dalga yaşar).
  let ilerleme: {
    katilimcilar: { id: string; ad: string; takim: string | null }[];
    ozTamamlar: Set<string>;
    puanladigi: Map<string, number>;
    onuPuanlayan: Map<string, number>;
    toplamPuan: number;
  } | null = null;

  if (acikDalga) {
    const [{ data: kisiler, error: kisiHatasi }, { data: puanlar, error: puanHatasi }] =
      await Promise.all([
        db
          .from("participants")
          .select("id, full_name, team")
          .eq("role", "participant")
          .order("full_name"),
        db
          .from("ratings")
          .select("rater_id, target_id")
          .eq("wave", acikDalga.id),
      ]);
    if (kisiHatasi) throw kisiHatasi;
    if (puanHatasi) throw puanHatasi;

    // (rater, target) çifti tüm özellikleri kapsıyorsa "tamamlanmış" sayılır.
    const ciftSayilari = new Map<string, number>();
    for (const p of puanlar) {
      const anahtar = `${p.rater_id}|${p.target_id}`;
      ciftSayilari.set(anahtar, (ciftSayilari.get(anahtar) ?? 0) + 1);
    }

    const ozTamamlar = new Set<string>();
    const puanladigi = new Map<string, number>();
    const onuPuanlayan = new Map<string, number>();
    for (const [anahtar, adet] of ciftSayilari) {
      if (adet < ozellikler.length) continue;
      const [rater, target] = anahtar.split("|");
      if (rater === target) {
        ozTamamlar.add(rater);
      } else {
        puanladigi.set(rater, (puanladigi.get(rater) ?? 0) + 1);
        onuPuanlayan.set(target, (onuPuanlayan.get(target) ?? 0) + 1);
      }
    }

    ilerleme = {
      katilimcilar: kisiler.map((k) => ({ id: k.id, ad: k.full_name, takim: k.team })),
      ozTamamlar,
      puanladigi,
      onuPuanlayan,
      toplamPuan: puanlar.length,
    };
  }

  // Canlı pano: katılımcı ızgarası + teslim akışı + takım sıralaması (#1/#4/#10).
  // Funnel: kamp öncesi katılım hunisinin dönüşümü (kim nerede takıldı).
  const [pano, funnel] = await Promise.all([canliPano(db), funnelMetrikleri(db)]);

  // #7 Asistan: kampın takvimi + sistemin durumundan tek önerilen adımı çıkar.
  const bugun = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
  }).format(new Date());

  // FUNNEL aşaması: kampın yolculuğunda operatör NEREDE? 1 Hazırlık → 2 Katılım
  // → 3 Kamp Canlı → 4 Final → 5 Sonrası. Pencere anahtarları + kamp takviminden
  // çıkarılır; omurga şeridi bunu vurgular.
  const kampGun = kampGunu(bugun);
  const sonKampGun = KAMP_GUNLERI[KAMP_GUNLERI.length - 1];
  const funnelAyar = new Map((funnelAyarlar ?? []).map((a) => [a.key, a.value]));
  const pusulaAcik = funnelAyar.get("pusula_acik") === "true";
  const muhurAcik = funnelAyar.get("muhur_acik") === "true";
  const onFarkAcik = funnelAyar.get("on_farkindalik_acik") === "true";
  const aktifAsama =
    bugun > sonKampGun
      ? 5
      : raporlarAcik || muhurAcik || sozAcik
        ? 4
        : acikDalga || kampGun != null
          ? 3
          : pusulaAcik
            ? 2
            : 1;

  // #15 Aşama açılış zaman damgaları + #18 ETA. Her aşamanın altında "açıldı
  // HH:MM" ya da (kamp öncesi) "kampa Xg" görünür — operatör temposunu ölçer.
  const funnelZaman = new Map((funnelAyarlar ?? []).map((a) => [a.key, a.updated_at]));
  const saatBicim = (iso: string | null | undefined): string | null => {
    if (!iso) return null;
    const g = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(new Date(iso));
    const sa = new Intl.DateTimeFormat("tr-TR", {
      timeZone: "Europe/Istanbul",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
    return g === bugun ? `açıldı ${sa}` : `açıldı ${g.slice(8)}/${g.slice(5, 7)} ${sa}`;
  };
  // Kampa kalan gün (ETA) — kamp öncesi 3·Canlı aşamasına bilgi olarak.
  const ilkGun = KAMP_GUNLERI[0];
  const kalanGun =
    bugun < ilkGun
      ? Math.ceil((new Date(ilkGun).getTime() - new Date(bugun).getTime()) / 86_400_000)
      : 0;
  const ilkDalgaAcilis = dalgalar
    .map((d) => d.opened_at)
    .filter((x): x is string => !!x)
    .sort()[0];
  const asamaZaman: Record<number, string> = {};
  const z2 = pusulaAcik ? saatBicim(funnelZaman.get("pusula_acik")) : null;
  if (z2) asamaZaman[2] = z2;
  const z3 = saatBicim(ilkDalgaAcilis) ?? (kalanGun > 0 ? `kampa ${kalanGun}g` : null);
  if (z3) asamaZaman[3] = z3;
  const z4 =
    saatBicim(raporlarAcik ? funnelZaman.get("reports_visible") : muhurAcik ? funnelZaman.get("muhur_acik") : null);
  if (z4) asamaZaman[4] = z4;

  const oneri = adminOnerisi({
    bugun,
    katilimciSayisi: katilimciSayisi ?? 0,
    acikDalgaId: acikDalga?.id ?? null,
    ozTamam: ilerleme?.ozTamamlar.size ?? 0,
    ozToplam: ilerleme?.katilimcilar.length ?? katilimciSayisi ?? 0,
    raporlarAcik,
    sozAcik,
    pusulaAcik,
    hazirTamam: funnel.adimlar.find((a) => a.anahtar === "onfark")?.sayi ?? 0,
    onFarkAcik,
  });

  // Basit panel #5/#6 — mini konum + "sırada ne var". Aşama adları funnel
  // şeridinden gelir; Basit'te şerit gizli olduğu için tek satırda özetlenir.
  const asamaAdlari = tr.admin.funnel.asamalar;
  const ASAMA_AD: Record<number, string> = {
    1: asamaAdlari.hazirlik,
    2: asamaAdlari.katilim,
    3: asamaAdlari.canli,
    4: asamaAdlari.final,
    5: asamaAdlari.sonrasi,
  };
  const siradakiAsama = aktifAsama < 5 ? ASAMA_AD[aktifAsama + 1] : null;

  // Aktif aşamanın tüm kontrollerini barındıran menü sayfası (panel yalnız
  // o aşamanın anahtarlarını gösterir; gerisi bu sayfada).
  const kontrolSayfa =
    aktifAsama <= 2
      ? "/admin/kontrol/hazirlik"
      : aktifAsama === 3
        ? "/admin/kontrol/canli"
        : aktifAsama === 4
          ? "/admin/kontrol/final"
          : "/admin/sistem";

  // #8 Proaktif uyarılar (yalnız tam yetkiliye gösterilir).
  const uyarilar = tamYetki
    ? adminUyarilari({
        acikDalgaAd: acikDalga?.name ?? null,
        ozTamam: ilerleme?.ozTamamlar.size ?? 0,
        ozToplam: ilerleme?.katilimcilar.length ?? katilimciSayisi ?? 0,
        moderasyonBekleyen: bekleyenFoto ?? 0,
        silmeTalebi: (silmeTalepleri ?? []).length,
        kayanSayi: kayanSayi ?? 0,
      })
    : [];

  const silmeBekleyen = (silmeTalepleri ?? []).length;

  // #7 Bölüm atlama listesi — yalnız var olan bölümler
  const atla = tr.admin.ux.atla;
  const bolumler = [
    { id: "ozet", etiket: atla.ozet },
    { id: "ilerleme", etiket: atla.ilerleme },
    ...(tamYetki ? [{ id: "tehlike", etiket: atla.tehlike }] : []),
    ...(tamYetki && silmeBekleyen > 0 ? [{ id: "kvkk", etiket: atla.kvkk }] : []),
  ];

  return (
    // #8 Mobilde alt sabit aksiyon çubuğu içeriği örtmesin: alt nefes payı.
    <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 p-4 pb-28 sm:p-6 sm:pb-6">
      {/* Katlı faz gruplarındaki çapalara (#dalga, #muhur …) atlamayı garanti et */}
      <CapaAcici />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-gold">{tr.admin.baslik}</h1>
          <Ipucu {...tr.admin.yardim.panel} />
        </div>
        <div className="flex items-center gap-2">
          {/* UX #2: terimler sözlüğü — içeriden kelimeler için sade karşılık */}
          <TerimlerSozluk />
          <OtoYenile />
        </div>
      </div>

      {/* FUNNEL OMURGASI — kampın 5 aşaması (yalnız Uzman; Basit'te tek adım odağı) */}
      <div className="uzman-only">
        <FunnelOmurga aktif={aktifAsama} zamanlar={asamaZaman} />
      </div>

      {/* #7 Bölüm atlama — yapışkan mini içindekiler (yalnız uzman) */}
      <div className="uzman-only">
        <BolumAtla bolumler={bolumler} />
      </div>

      {!tamYetki && (
        <p className="rounded-xl border border-royal-light/40 bg-royal/15 px-4 py-3 text-sm font-medium text-slate-100">
          {tr.admin.yardimci.banner}
        </p>
      )}

      {/* Basit #10 — ilk girişte tek seferlik "nasıl çalışır" ipucu */}
      <BasitIlkIpucu />

      {/* #2 HERO: "Şimdi ne yapmalıyım?" — adminin o an basması gereken TEK
          adım, sayfanın en üstünde. #4 Tek vurgu kuralı: altın + parıltı
          YALNIZ bu karta; gerisi nötr. Renk = öncelik sinyali. */}
      <section
        id="ozet"
        className={`kart-3d scroll-mt-24 rounded-2xl p-6 shadow-xl ring-1 backdrop-blur ${
          oneri.vurgu
            ? "parilti bg-gold/10 ring-gold/50"
            : "bg-midnight-card/60 ring-royal/30"
        }`}
      >
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          {tr.admin.asistan.baslik}
          <Ipucu {...tr.admin.yardim.panelAsistan} />
        </p>
        <div className="mt-2 flex items-start gap-4">
          <span className="text-4xl" aria-hidden>
            {oneri.ikon}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold text-gold-light">{oneri.baslik}</h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-300">
              {oneri.aciklama}
            </p>
          </div>
        </div>
        {/* Basit #1-4,9 — eylem doluysa buton işi DOĞRUDAN yapar (tek tık,
            anlık geri bildirim, geri al, kritikse onay); değilse kontrole götürür. */}
        {oneri.eylem ? (
          <BasitEylem
            eylem={oneri.eylem}
            dalga={oneri.eylemDalga}
            etiket={oneri.butonEtiket}
            basariMesaj={oneri.basari ?? "İşlem tamam."}
            onayMesaj={oneri.onay}
          />
        ) : (
          <OneriButonu href={oneri.href} etiket={oneri.butonEtiket} />
        )}

        {/* Basit #7 — yapacak acil iş yokken sakin güven cümlesi (telaş yok) */}
        {!oneri.vurgu && (
          <p className="basit-only mt-3 text-center text-xs text-emerald-300/80">
            ✓ Şu an acil bir şey yok — her şey yolunda. Hazır olduğunda yukarıdaki adımı at.
          </p>
        )}
      </section>

      {/* Basit panel #6 konum + #5 sırada + #8 tek kısayol — şerit gizli olduğu
          için Basit'te tek satırlık "neredeyim / sırada ne var / kişiler" özeti. */}
      <div className="basit-only flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          {/* #6 mini konum göstergesi */}
          <span className="inline-flex items-center gap-1.5 rounded-full border border-royal-light/30 bg-white/[0.03] px-3 py-1.5 font-medium text-slate-300">
            <span aria-hidden>📍</span>
            Aşama {aktifAsama}/5 · {ASAMA_AD[aktifAsama]}
          </span>
          {/* #8 tek kısayol — katılımcı listesi */}
          <Link
            href="/admin/katilimcilar"
            className="inline-flex items-center gap-1.5 rounded-full border border-royal-light/30 px-3 py-1.5 font-medium text-gold-light transition-colors hover:bg-white/5"
          >
            👥 Katılımcılar
          </Link>
        </div>
        {/* #5 sırada ne var — tek satır */}
        {siradakiAsama && (
          <p className="px-1 text-xs text-slate-500">
            <span className="font-semibold text-slate-400">Sırada:</span> {siradakiAsama} aşaması.
          </p>
        )}
      </div>

      {/* Şimdi/Sonra şeridi + kurulum rehberi — Uzman (Basit'te tek hero adımı yeter) */}
      <div className="uzman-only space-y-6">
        <SimdiSonra aktifAsama={aktifAsama} />
        {tamYetki && <HazirlikPaneli konum="ust" aktifAsama={aktifAsama} />}
      </div>

      {/* GENEL DURUM: canlı özet rakamları (yalnız Uzman — Basit'te tek adım odağı) */}
      <section className="uzman-only kart-3d space-y-4 rounded-2xl bg-midnight-card/60 p-5 shadow-xl ring-1 ring-royal/30 backdrop-blur">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gold-light">
            {tr.admin.ozet.genelBaslik}
          </h2>
          <Ipucu {...tr.admin.yardim.panelOzet} />
        </div>
        <p className="basit-only -mt-2 text-xs text-slate-500">
          Kampın o anki nabzı — tek bakışta kaç kişi katıldı ve ne kadar ilerlendi.
        </p>
        <CanliOzet
          ciplak
          katilimci={katilimciSayisi ?? 0}
          ozTamam={ilerleme?.ozTamamlar.size ?? 0}
          ozToplam={ilerleme?.katilimcilar.length ?? katilimciSayisi ?? 0}
          gorus={ilerleme?.toplamPuan ?? 0}
          dalgaAd={acikDalga?.name ?? null}
        />
        {/* Dönüşüm hunisi metriği — ileri (yalnız uzman) */}
        {funnel.toplam > 0 && (
          <div className="uzman-only">
            <div className="h-px bg-white/10" />
            <div className="mt-4" />
            <FunnelMetrik ciplak ozet={funnel} />
          </div>
        )}
      </section>

      {/* Canlı pano: ızgara + teslim akışı + takım sıralaması (kampın nabzı) — uzman */}
      <div className="uzman-only">
        <CanliPano
          izgara={pano.izgara}
          teslimler={pano.teslimler}
          takimlar={pano.takimlar}
          ozet={pano.ozet}
        />
      </div>

      {/* Son eylemler + proaktif uyarılar — tek "dikkat" bloğu (uzman) */}
      {tamYetki && (
        <div className="uzman-only space-y-3">
          <SonEylemler />
          <Uyarilar uyarilar={uyarilar} />
        </div>
      )}

      {/* Bugünün Akışı — kamp günündeyse o günün adımları (yalnız Uzman) */}
      <div className="uzman-only">
        <GununAkisi bugun={bugun} />
      </div>

      {/* CANLI ÇALIŞMA ALANI: açık dalga ilerlemesi + toplu eylem (yalnız Uzman) */}
      <section className="uzman-only kart-3d rounded-2xl bg-midnight-card/60 p-6 shadow-xl ring-1 ring-royal/30 backdrop-blur">
        <h2 id="ilerleme" className="scroll-mt-20 text-lg font-semibold text-slate-200">
          {tr.admin.ilerleme.baslik}
          {acikDalga && (
            <span className="ml-2 text-sm font-normal text-slate-400">
              · {acikDalga.name}
            </span>
          )}
          <Ipucu {...tr.admin.yardim.panelIlerleme} />
        </h2>
        {/* Basit modda sade açıklama */}
        <p className="basit-only mt-1 text-sm text-slate-400">
          Şu an kim ne yapıyor: kaç kişi kendini puanladı, kaç görüş toplandı. Takılanlar aşağıda.
        </p>
        {acikDalga && (
          <p className="mt-2 rounded-lg bg-amber-900/15 px-3 py-2 text-xs font-medium text-amber-300/90">
            {tr.admin.ilerleme.ozellikUyari}
          </p>
        )}

        {/* Komuta triyajı: hazırlıkta takılanlar (≤aşama 2) / sessizleşenler (≥aşama 3) */}
        {tamYetki && (
          <div className="mt-4">
            <TriyajKart aktifAsama={aktifAsama} />
          </div>
        )}

        {!ilerleme ? (
          /* #6 Bağlamsal sakin boş durum: "bozuk mu?" hissi yerine güven. */
          <div className="mt-4 rounded-xl border border-white/5 bg-white/[0.02] px-5 py-8 text-center">
            <p className="text-4xl" aria-hidden>
              {tr.admin.bosDurum.ikon}
            </p>
            <p className="mt-3 text-base font-semibold text-slate-200">
              {tr.admin.bosDurum.baslik}
            </p>
            <p className="mt-1 text-sm text-slate-400">{tr.admin.bosDurum.aciklama}</p>
          </div>
        ) : (
          <>
            <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl bg-midnight-soft p-3">
                <dd className="text-2xl font-bold text-gold">
                  {ilerleme.katilimcilar.length}
                </dd>
                <dt className="mt-1 text-xs text-slate-400">
                  {tr.admin.ilerleme.katilimci}
                </dt>
              </div>
              <div className="rounded-xl bg-midnight-soft p-3">
                <dd className="text-2xl font-bold text-gold">
                  {ilerleme.ozTamamlar.size}/{ilerleme.katilimcilar.length}
                </dd>
                <dt className="mt-1 text-xs text-slate-400">
                  {tr.admin.ilerleme.ozTamam}
                </dt>
              </div>
              <div className="rounded-xl bg-midnight-soft p-3">
                <dd className="text-2xl font-bold text-gold">{ilerleme.toplamPuan}</dd>
                <dt className="mt-1 text-xs text-slate-400">
                  {tr.admin.ilerleme.toplamPuan}
                </dt>
              </div>
            </dl>

            <div className="uzman-only mt-4">
              <TopluEylem
                katilimcilar={ilerleme.katilimcilar.map((k) => ({
                  id: k.id,
                  ad: k.ad,
                  takim: k.takim,
                  ozTamam: ilerleme.ozTamamlar.has(k.id),
                  puanladigi: ilerleme.puanladigi.get(k.id) ?? 0,
                  onuPuanlayan: ilerleme.onuPuanlayan.get(k.id) ?? 0,
                }))}
                ozellikSayisi={ozellikler.length}
              />
            </div>
            {ilerleme.katilimcilar.length - ilerleme.ozTamamlar.size > 0 && (
              <EksikDurt
                eksikSayisi={ilerleme.katilimcilar.length - ilerleme.ozTamamlar.size}
              />
            )}
          </>
        )}
      </section>

      {/* BU AŞAMANIN ANAHTARLARI — panel artık yalnız AKTİF aşamanın switch'lerini
          tutar (durum + adım + aktif anahtar). Diğer aşamalar, sistem ve tüm
          araçlar üstteki 1·2·3·4 ve ⚙ Sistem menülerinin altında. */}
      {tamYetki && (
        <section
          id="tehlike"
          className="scroll-mt-24 space-y-4 rounded-2xl border border-royal/30 bg-midnight-card/50 p-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-lg font-bold text-gold-light">
              🎛 Bu Aşamanın Anahtarları
              <Ipucu {...tr.admin.yardim.tehlike} />
            </h2>
            <Link
              href={kontrolSayfa}
              className="text-xs font-medium text-royal-light hover:underline"
            >
              Tüm aşama kontrolleri →
            </Link>
          </div>
          <p className="text-sm leading-relaxed text-slate-300">
            Şu an <span className="font-semibold text-gold-light">{ASAMA_AD[aktifAsama]}</span>{" "}
            aşamasındasın; aşağıda yalnız bu aşamanın anahtarları var. Her işlem önce onay
            ister ve geri-al penceresi sunar. Diğer aşamalar ve tüm araçlar üstteki menülerde.
          </p>

          {/* 1-2 · Hazırlık & Katılım anahtarları */}
          {(aktifAsama === 1 || aktifAsama === 2) && (
            <div className="space-y-4">
              <div id="fazsifir" className="scroll-mt-24 rounded-xl bg-midnight-card/60 p-5 ring-1 ring-royal/30">
                <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-100">
                  {tr.admin.fazSifir.baslik}
                  <Ipucu {...tr.admin.yardim.fazSifir} />
                </h3>
                <FazSifirKontrol />
              </div>
              <div id="onfark" className="scroll-mt-24 rounded-xl bg-midnight-card/60 p-5 ring-1 ring-royal/30">
                <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-100">
                  {tr.admin.onFark.baslik}
                </h3>
                <OnFarkindalikKontrol />
              </div>
            </div>
          )}

          {/* 3 · Kamp Canlı anahtarları */}
          {aktifAsama === 3 && (
            <div className="space-y-4">
              <div id="dalga" className="scroll-mt-20 rounded-xl bg-midnight-card/60 p-5 ring-1 ring-royal/30">
                <h3 className="flex items-center gap-2 text-base font-semibold text-slate-100">
                  {tr.admin.dalga.baslik}
                  <Ipucu {...tr.admin.yardim.dalga} />
                </h3>
                <p className="mt-1 text-sm text-slate-400">{tr.admin.dalga.aciklama}</p>
                <DalgaKontrol
                  dalgalar={dalgalar.map((d) => ({ id: d.id, ad: d.name, acik: d.is_open }))}
                  puanlamayan={
                    acikDalga && ilerleme
                      ? ilerleme.katilimcilar.filter(
                          (k) => (ilerleme.puanladigi.get(k.id) ?? 0) === 0
                        ).length
                      : 0
                  }
                />
              </div>
              <div id="hedef" className="scroll-mt-24 rounded-xl bg-midnight-card/60 p-5 ring-1 ring-royal/30">
                <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-100">
                  🎯 {tr.admin.hedef.baslik}
                </h3>
                <HedefKontrol />
              </div>
            </div>
          )}

          {/* 4 · Final anahtarları */}
          {aktifAsama === 4 && (
            <div className="space-y-4">
              <div id="fazbir" className="scroll-mt-24 rounded-xl bg-midnight-card/60 p-5 ring-1 ring-royal/30">
                <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-100">
                  {tr.admin.fazBir.baslik}
                  <Ipucu {...tr.admin.yardim.fazBir} />
                </h3>
                <BoslukKontrol />
              </div>
              <div id="ayna-ani" className="scroll-mt-20 rounded-xl bg-midnight-card/60 p-5 ring-1 ring-royal/30">
                <h3 className="flex items-center gap-2 text-base font-semibold text-slate-100">
                  {tr.admin.aynaAni.baslik}
                  <Ipucu {...tr.admin.yardim.rapor} />
                </h3>
                <p className="mt-1 text-sm text-slate-400">{tr.admin.aynaAni.aciklama}</p>
                <AynaAniKontrol
                  acik={raporlarAcik}
                  mektupHazir={mektupSayisi ?? 0}
                  mektupToplam={katilimciSayisi ?? 0}
                />
              </div>
              <div id="muhur" className="scroll-mt-24 rounded-xl bg-midnight-card/60 p-5 ring-1 ring-royal/30">
                <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-100">
                  {tr.admin.muhur.baslik}
                  <Ipucu {...tr.admin.yardim.muhur} />
                </h3>
                <MuhurKontrol />
              </div>
              <div id="soz-v2" className="scroll-mt-24 rounded-xl bg-midnight-card/60 p-5 ring-1 ring-royal/30">
                <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-100">
                  📜 {tr.admin.sozV2.baslik}
                </h3>
                <SozV2Kontrol />
              </div>
            </div>
          )}

          {/* 5 · Kamp sonrası — panelde anahtar yok; araçlar menüde */}
          {aktifAsama === 5 && (
            <p className="rounded-xl border border-white/5 bg-white/[0.02] px-4 py-6 text-center text-sm text-slate-400">
              Kamp tamamlandı — bu aşamada panelde anahtar yok. Kapanış kontrolleri{" "}
              <Link href="/admin/kontrol/final" className="text-royal-light hover:underline">
                4 · Final
              </Link>{" "}
              menüsünde, kamp sonrası araçlar oradadır.
            </p>
          )}
        </section>
      )}

      {/* Tüm kontroller & araçlar üstteki menülerde — yön gösterici. */}
      {tamYetki && (
        <p className="rounded-xl border border-royal-light/20 bg-white/[0.02] px-4 py-3 text-center text-sm text-slate-400">
          Tüm kontroller ve araçlar üstteki{" "}
          <span className="font-semibold text-gold-light">1·2·3·4</span> ve{" "}
          <span className="font-semibold text-gold-light">⚙ Sistem</span> menülerinin altında.
        </p>
      )}

      {/* KVKK — bekleyen silme talebi varsa ACİL uyarı; işlem ⚙ Sistem'de. */}
      {tamYetki && silmeBekleyen > 0 && (
        <Link
          id="kvkk"
          href="/admin/sistem#kvkk"
          className="scroll-mt-24 flex items-center justify-between gap-3 rounded-2xl bg-red-950/15 px-5 py-4 ring-1 ring-red-400/40 transition-colors hover:bg-red-950/25"
        >
          <span className="text-sm font-semibold text-red-200">
            ⚠️ {silmeBekleyen} bekleyen KVKK silme talebi
          </span>
          <span className="shrink-0 text-sm font-medium text-red-200">Sistem’de işle →</span>
        </Link>
      )}

      {/* #8 Mobil alt aksiyon çubuğu — yalnız kritik (vurgu) öneride */}
      {oneri.vurgu && (
        <AltAksiyonCubugu
          baslik={oneri.baslik}
          href={oneri.href}
          ikon={oneri.ikon}
        />
      )}
    </main>
  );
}
