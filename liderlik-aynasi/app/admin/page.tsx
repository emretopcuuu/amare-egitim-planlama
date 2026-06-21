import Link from "next/link";
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
import DavetKontrol from "./DavetKontrol";
import YedekButonu from "./YedekButonu";
import SilmeTalepleri from "./SilmeTalepleri";
import IkiliKontrol from "./IkiliKontrol";
import EksikDurt from "./EksikDurt";
import OtoYenile from "./OtoYenile";
import GununAkisi from "./GununAkisi";
import HazirlikPaneli from "./HazirlikPaneli";
import CanliOzet from "./CanliOzet";
import KodBul from "./KodBul";
import Uyarilar from "./Uyarilar";
import Ipucu from "./Ipucu";
import ProvaModuKontrol from "./ProvaModuKontrol";
import TopluEylem from "./TopluEylem";
import OtomatikZamanlama from "./OtomatikZamanlama";
import IslemGunlugu from "./IslemGunlugu";
import Katlanir from "./Katlanir";
import AltAksiyonCubugu from "./AltAksiyonCubugu";
import FazSifirKontrol from "./FazSifirKontrol";
import BoslukKontrol from "./BoslukKontrol";
import OnFarkindalikKontrol from "./OnFarkindalikKontrol";
import HedefKontrol from "./HedefKontrol";
import MuhurKontrol from "./MuhurKontrol";
import OdevPaketi from "./OdevPaketi";
import SonEylemler from "./SonEylemler";
import CanliPano from "./CanliPano";
import FunnelMetrik from "./FunnelMetrik";
import TriyajKart from "./TriyajKart";
import AkisDizisi from "./AkisDizisi";
import BolumAtla from "./BolumAtla";

export const metadata = { title: "Yönetim Paneli — Liderlik Aynası" };

// #1 Tehlike bölgesi kontrollerini funnel aşamalarına ayıran etiket. Aktif
// aşamadaki grup altın vurguyla öne çıkar; operatör "şu an buradayım"ı görür.
function AsamaEtiket({ no, ad, aktif }: { no?: number; ad: string; aktif?: number }) {
  const buradayim = no != null && no === aktif;
  return (
    <p
      className={`flex items-center gap-2 pt-2 text-[0.7rem] font-bold uppercase tracking-wide ${
        buradayim ? "text-gold-light" : "text-slate-500"
      }`}
    >
      {no != null && (
        <span
          className={`flex h-5 w-5 items-center justify-center rounded-full text-[0.65rem] ${
            buradayim ? "bg-gold text-[#1a1206]" : "bg-white/10 text-slate-400"
          }`}
        >
          {no}
        </span>
      )}
      {ad}
      {buradayim && <span className="text-gold-light">• şu an</span>}
    </p>
  );
}

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
    { count: epostaliSayisi },
    { data: davetAyari },
    { data: silmeTalepleri },
    { count: ikiliSayisi },
    { data: sozAyar },
    { count: bekleyenFoto },
    { data: provaAyar },
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
      .select("id", { count: "exact", head: true })
      .eq("role", "participant")
      .not("email", "is", null),
    db
      .from("settings")
      .select("value")
      .eq("key", "wave4_davet_gonderildi")
      .maybeSingle(),
    db
      .from("participants")
      .select("id, full_name, team, deletion_requested_at")
      .not("deletion_requested_at", "is", null)
      .order("deletion_requested_at"),
    db.from("pairs").select("id", { count: "exact", head: true }),
    db.from("settings").select("value").eq("key", "kapanis_soz_acik").maybeSingle(),
    db
      .from("photos")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    db.from("settings").select("value").eq("key", "prova_modu").maybeSingle(),
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
  const provaAcik = provaAyar?.value === "true";

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
    ...(tamYetki ? [{ id: "araclar", etiket: atla.araclar }] : []),
  ];

  return (
    // #8 Mobilde alt sabit aksiyon çubuğu içeriği örtmesin: alt nefes payı.
    <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 p-6 pb-28 sm:pb-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-gold">{tr.admin.baslik}</h1>
          <Ipucu {...tr.admin.yardim.panel} />
        </div>
        <OtoYenile />
      </div>

      {/* FUNNEL OMURGASI — kampın 5 aşaması, şu an neredeyiz, açılış zamanları */}
      <FunnelOmurga aktif={aktifAsama} zamanlar={asamaZaman} />

      {/* #7 Bölüm atlama — yapışkan mini içindekiler */}
      <BolumAtla bolumler={bolumler} />

      {!tamYetki && (
        <p className="rounded-xl border border-royal-light/40 bg-royal/15 px-4 py-3 text-sm font-medium text-slate-100">
          {tr.admin.yardimci.banner}
        </p>
      )}

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
        <Link
          href={oneri.href}
          className="btn-kor parilti mt-4 flex h-14 w-full items-center justify-center rounded-2xl text-lg font-bold transition-transform hover:scale-[1.01]"
        >
          {oneri.butonEtiket}
        </Link>
      </section>

      {/* UX #5 (2.tur): İlk Kurulum Rehberi — kritik bir kurulum adımı eksikse
          panelin tepesinde numaralı rehber belirir; kurulum bitince kaybolur. */}
      {tamYetki && <HazirlikPaneli konum="ust" aktifAsama={aktifAsama} />}

      {/* UX #1 (2.tur): Komuta triyajı — şu an ilgilenilmesi gereken adaylar */}
      {tamYetki && <TriyajKart aktifAsama={aktifAsama} />}

      {/* #7 Tıklanır canlı özet — büyük rakamlar (her iki rol) */}
      <CanliOzet
        katilimci={katilimciSayisi ?? 0}
        ozTamam={ilerleme?.ozTamamlar.size ?? 0}
        ozToplam={ilerleme?.katilimcilar.length ?? katilimciSayisi ?? 0}
        gorus={ilerleme?.toplamPuan ?? 0}
        dalgaAd={acikDalga?.name ?? null}
      />

      {/* Katılım hunisi: kamp öncesi dönüşüm — kim nerede takıldı (öneri #4) */}
      <FunnelMetrik ozet={funnel} />

      {/* Canlı pano: ızgara + teslim akışı + takım sıralaması (kampın nabzı) */}
      <CanliPano
        izgara={pano.izgara}
        teslimler={pano.teslimler}
        takimlar={pano.takimlar}
        ozet={pano.ozet}
      />

      {/* #5 Son kritik eylemler şeridi */}
      {tamYetki && <SonEylemler />}

      {/* Proaktif uyarılar — dikkat isteyen durumlar */}
      <Uyarilar uyarilar={uyarilar} />

      {/* Bugünün Akışı — kamp günündeyse o günün adımları */}
      <GununAkisi bugun={bugun} />

      {/* CANLI ÇALIŞMA ALANI: açık dalga ilerlemesi + toplu eylem */}
      <section className="kart-3d rounded-2xl bg-midnight-card/60 p-6 shadow-xl ring-1 ring-royal/30 backdrop-blur">
        <h2 id="ilerleme" className="scroll-mt-20 text-lg font-semibold text-slate-200">
          {tr.admin.ilerleme.baslik}
          {acikDalga && (
            <span className="ml-2 text-sm font-normal text-slate-400">
              · {acikDalga.name}
            </span>
          )}
          <Ipucu {...tr.admin.yardim.panelIlerleme} />
        </h2>
        {acikDalga && (
          <p className="mt-2 rounded-lg bg-amber-900/15 px-3 py-2 text-xs font-medium text-amber-300/90">
            {tr.admin.ilerleme.ozellikUyari}
          </p>
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

            <div className="mt-4">
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

      {/* #5 TEHLİKE BÖLGESİ — tüm katılımcıları etkileyen kritik anahtarlar
          tek, görsel olarak ayrılmış bir bölgede toplanır. Her birinin onayı +
          geri-al penceresi var. Yalnız tam yetkili admin. */}
      {tamYetki && (
        <section
          id="tehlike"
          className="scroll-mt-24 space-y-5 rounded-2xl border-2 border-red-500/30 bg-red-950/10 p-5"
        >
          <div className="flex items-start gap-3">
            <span className="text-xl" aria-hidden>
              ⚠️
            </span>
            <div>
              <h2 className="flex items-center gap-2 text-lg font-bold text-red-200">
                {tr.admin.tehlike.baslik}
                <Ipucu {...tr.admin.yardim.tehlike} />
              </h2>
              <p className="mt-0.5 text-xs text-slate-400">{tr.admin.tehlike.aciklama}</p>
            </div>
          </div>

          {/* #3 Kamp akışı sıralayıcı — sıradaki anahtar + bağımlılık kapısı */}
          <AkisDizisi />

          {/* #1 Kontroller funnel sırasında: Katılım → Canlı → Final → Sistem.
              Aşama etiketleri omurgayla birebir hizalı. */}

          {/* ── 2 · KATILIM ── */}
          <AsamaEtiket no={2} ad={tr.admin.funnel.asamalar.katilim} aktif={aktifAsama} />

          {/* FAZ 0 — Pusula penceresi + oda QR kodu (kampa giriş kilidi) */}
          <div id="fazsifir" className="scroll-mt-24 rounded-xl bg-midnight-card/60 p-5 ring-1 ring-royal/30">
            <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-100">
              {tr.admin.fazSifir.baslik}
              <Ipucu {...tr.admin.yardim.fazSifir} />
            </h3>
            <FazSifirKontrol />
          </div>

          {/* FAZ A — Ön Farkındalık penceresi (pusuladan sonra, kampa girmeden) */}
          <div id="onfark" className="scroll-mt-24 rounded-xl bg-midnight-card/60 p-5 ring-1 ring-royal/30">
            <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-100">
              {tr.admin.onFark.baslik}
            </h3>
            <OnFarkindalikKontrol />
          </div>

          {/* FAZ A — Hedef (Gün 2): nedenden kariyer hedefi + plan */}
          <div id="hedef" className="scroll-mt-24 rounded-xl bg-midnight-card/60 p-5 ring-1 ring-royal/30">
            <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-100">
              🎯 {tr.admin.hedef.baslik}
            </h3>
            <HedefKontrol />
          </div>

          {/* ── 3 · KAMP CANLI ── */}
          <AsamaEtiket no={3} ad={tr.admin.funnel.asamalar.canli} aktif={aktifAsama} />

          {/* Dalga */}
          <div
            id="dalga"
            className="scroll-mt-20 rounded-xl bg-midnight-card/60 p-5 ring-1 ring-royal/30"
          >
            <h3 className="flex items-center gap-2 text-base font-semibold text-slate-100">
              {tr.admin.dalga.baslik}
              <Ipucu {...tr.admin.yardim.dalga} />
            </h3>
            <p className="mt-1 text-sm text-slate-400">{tr.admin.dalga.aciklama}</p>
            <DalgaKontrol
              dalgalar={dalgalar.map((d) => ({
                id: d.id,
                ad: d.name,
                acik: d.is_open,
              }))}
              puanlamayan={
                acikDalga && ilerleme
                  ? ilerleme.katilimcilar.filter(
                      (k) => (ilerleme.puanladigi.get(k.id) ?? 0) === 0
                    ).length
                  : 0
              }
            />
          </div>

          {/* ── 4 · FİNAL — Ayna Anı ── */}
          <AsamaEtiket no={4} ad={tr.admin.funnel.asamalar.final} aktif={aktifAsama} />

          {/* FAZ 1 — Boşluk Anı penceresi + derinlik panosu */}
          <div id="fazbir" className="scroll-mt-24 rounded-xl bg-midnight-card/60 p-5 ring-1 ring-royal/30">
            <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-100">
              {tr.admin.fazBir.baslik}
              <Ipucu {...tr.admin.yardim.fazBir} />
            </h3>
            <BoslukKontrol />
          </div>

          {/* Ayna Anı (raporlar) */}
          <div
            id="ayna-ani"
            className="scroll-mt-20 rounded-xl bg-midnight-card/60 p-5 ring-1 ring-royal/30"
          >
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

          {/* A2 — Mühür Açılışı (kamp sonu before/after sesli reveal) */}
          <div id="muhur" className="scroll-mt-24 rounded-xl bg-midnight-card/60 p-5 ring-1 ring-royal/30">
            <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-100">
              {tr.admin.muhur.baslik}
              <Ipucu {...tr.admin.yardim.muhur} />
            </h3>
            <MuhurKontrol />
          </div>

          {/* ── SİSTEM (kesişen) ── */}
          <AsamaEtiket ad={tr.admin.tehlike.sistemEtiket} />

          {/* #9 Prova Modu — canlı/test ayrımı kritik bir anahtar */}
          <div className="rounded-xl bg-midnight-card/60 p-5 ring-1 ring-royal/30">
            <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-100">
              {tr.provaModu.baslikKapali}
              <Ipucu {...tr.admin.yardim.prova} />
            </h3>
            <ProvaModuKontrol acik={provaAcik} />
          </div>
        </section>
      )}

      {/* KVKK — yalnız bekleyen talep varsa (yasal/acil), üst seviyede kırmızı.
          Boşken hiç gösterilmez (#6: boş bölüm yok). */}
      {tamYetki && silmeBekleyen > 0 && (
        <section
          id="kvkk"
          className="kart-3d scroll-mt-20 rounded-2xl bg-midnight-card/60 p-6 shadow-xl ring-1 ring-red-400/40 backdrop-blur"
        >
          <h2 className="flex items-center gap-2 text-lg font-semibold text-red-200">
            {tr.kvkk.adminBaslik}
            <Ipucu {...tr.admin.yardim.kvkk} />
          </h2>
          <p className="mt-1 text-sm text-slate-400">{tr.kvkk.adminAciklama}</p>
          <SilmeTalepleri
            talepler={(silmeTalepleri ?? []).map((k) => ({
              id: k.id,
              ad: k.full_name,
              takim: k.team,
              tarih: new Intl.DateTimeFormat("tr-TR", {
                timeZone: "Europe/Istanbul",
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              }).format(new Date(k.deletion_requested_at!)),
            }))}
          />
        </section>
      )}

      {/* #1 TÜM ARAÇLAR — faz dışı ikincil her şey tek katlanır bölümde.
          Varsayılan kapalı: panel açılınca yalnız o anki işe odaklanılır. */}
      {tamYetki && (
        <div id="araclar" className="scroll-mt-24">
        <Katlanir baslik={tr.admin.araclar.baslik} aciklama={tr.admin.araclar.aciklama} yardim={tr.admin.yardim.araclar}>
          {/* #10 Araçlar artık aşamaya göre gruplu: Kamp Sonrası + Sistem. */}

          {/* 📦 KAMP SONRASI — kamp bittikten sonraki uzun soluklu araçlar */}
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            {tr.admin.araclar.grupSonrasi}
          </p>

          {/* Ödev paketi (kamp sonrası 10/15 gün, Ağustos) */}
          <section className="kart-3d rounded-2xl bg-midnight-card/60 p-6 shadow-xl ring-1 ring-royal/30 backdrop-blur">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-gold-light">
              {tr.admin.odev.baslik}
              <Ipucu {...tr.admin.yardim.odev} />
            </h2>
            <div className="mt-3">
              <OdevPaketi />
            </div>
          </section>

          <section
            id="davet"
            className="kart-3d scroll-mt-20 rounded-2xl bg-midnight-card/60 p-6 shadow-xl ring-1 ring-royal/30 backdrop-blur"
          >
            <h2 className="flex items-center gap-2 text-lg font-semibold text-gold-light">
              {tr.admin.doksanGun.baslik}
              <Ipucu {...tr.admin.yardim.davet} />
            </h2>
            <p className="mt-1 text-sm text-slate-400">{tr.admin.doksanGun.aciklama}</p>
            <DavetKontrol
              epostali={epostaliSayisi ?? 0}
              toplam={katilimciSayisi ?? 0}
              sonGonderim={davetAyari?.value ?? null}
            />
          </section>

          <section className="kart-3d rounded-2xl bg-midnight-card/60 p-6 shadow-xl ring-1 ring-royal/30 backdrop-blur">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-gold-light">
              {tr.admin.ikili.baslik}
              <Ipucu {...tr.admin.yardim.ikili} />
            </h2>
            <p className="mt-1 mb-4 text-sm text-slate-400">{tr.admin.ikili.aciklama}</p>
            <IkiliKontrol mevcut={ikiliSayisi ?? 0} />
          </section>

          {/* ⚙️ SİSTEM & KAYIT — her aşamada lazım olan genel araçlar */}
          <p className="pt-2 text-xs font-bold uppercase tracking-wide text-slate-500">
            {tr.admin.araclar.grupSistem}
          </p>

          {/* Sağlık kontrol listesi — her zaman erişilebilir tam görünüm */}
          <HazirlikPaneli konum="arac" aktifAsama={aktifAsama} />
          <KodBul />

          <section className="kart-3d rounded-2xl bg-midnight-card/60 p-6 shadow-xl ring-1 ring-royal/30 backdrop-blur">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-gold-light">
              {tr.admin.yedek.baslik}
              <Ipucu {...tr.admin.yardim.yedek} />
            </h2>
            <p className="mt-1 mb-4 text-sm text-slate-400">{tr.admin.yedek.aciklama}</p>
            <YedekButonu />
          </section>

          <section className="kart-3d rounded-2xl bg-midnight-card/60 p-6 shadow-xl ring-1 ring-royal/30 backdrop-blur">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-gold-light">
              {tr.zamanlama.baslik}
              <Ipucu {...tr.admin.yardim.zamanlama} />
            </h2>
            <p className="mt-1 mb-4 text-sm text-slate-400">{tr.zamanlama.aciklama}</p>
            <OtomatikZamanlama
              dalgalar={dalgalar.map((d) => ({ id: d.id, ad: d.name }))}
            />
          </section>

          {/* İşlem günlüğü: kritik eylemler buraya düşer; geri-al ise eylem
              anındaki tostta sunulur (dalga/rapor). Kayıt + geri-al birlikte. */}
          <div id="islem-gunlugu" className="scroll-mt-24">
            <IslemGunlugu />
          </div>
        </Katlanir>
        </div>
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
