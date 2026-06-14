import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { aktifOzellikler } from "@/lib/degerlendirme";
import { raporlarGorunurMu } from "@/lib/rapor";
import { adminOnerisi } from "@/lib/adminAsistan";
import { adminUyarilari } from "@/lib/adminUyarilar";
import { tr } from "@/lib/i18n/tr";
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
import DuyuruSablonlari from "./DuyuruSablonlari";
import Ipucu from "./Ipucu";
import ProvaModuKontrol from "./ProvaModuKontrol";
import TopluEylem from "./TopluEylem";
import OtomatikZamanlama from "./OtomatikZamanlama";
import IslemGunlugu from "./IslemGunlugu";
import Katlanir from "./Katlanir";
import AltAksiyonCubugu from "./AltAksiyonCubugu";
import FazSifirKontrol from "./FazSifirKontrol";
import BoslukKontrol from "./BoslukKontrol";
import OdevPaketi from "./OdevPaketi";

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
    { count: epostaliSayisi },
    { data: davetAyari },
    { data: silmeTalepleri },
    { count: ikiliSayisi },
    { data: sozAyar },
    { count: bekleyenFoto },
    { data: provaAyar },
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

  // #7 Asistan: kampın takvimi + sistemin durumundan tek önerilen adımı çıkar.
  const bugun = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
  }).format(new Date());
  const oneri = adminOnerisi({
    bugun,
    katilimciSayisi: katilimciSayisi ?? 0,
    acikDalgaId: acikDalga?.id ?? null,
    ozTamam: ilerleme?.ozTamamlar.size ?? 0,
    ozToplam: ilerleme?.katilimcilar.length ?? katilimciSayisi ?? 0,
    raporlarAcik,
    sozAcik,
  });

  // #8 Proaktif uyarılar (yalnız tam yetkiliye gösterilir).
  const uyarilar = tamYetki
    ? adminUyarilari({
        acikDalgaAd: acikDalga?.name ?? null,
        ozTamam: ilerleme?.ozTamamlar.size ?? 0,
        ozToplam: ilerleme?.katilimcilar.length ?? katilimciSayisi ?? 0,
        moderasyonBekleyen: bekleyenFoto ?? 0,
        silmeTalebi: (silmeTalepleri ?? []).length,
      })
    : [];

  const silmeBekleyen = (silmeTalepleri ?? []).length;

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

      {!tamYetki && (
        <p className="rounded-xl border border-royal-light/40 bg-royal/15 px-4 py-3 text-sm font-medium text-slate-100">
          {tr.admin.yardimci.banner}
        </p>
      )}

      {/* #2 HERO: "Şimdi ne yapmalıyım?" — adminin o an basması gereken TEK
          adım, sayfanın en üstünde. #4 Tek vurgu kuralı: altın + parıltı
          YALNIZ bu karta; gerisi nötr. Renk = öncelik sinyali. */}
      <section
        className={`kart-3d rounded-2xl p-6 shadow-xl ring-1 backdrop-blur ${
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

      {/* #7 Tıklanır canlı özet — büyük rakamlar (her iki rol) */}
      <CanliOzet
        katilimci={katilimciSayisi ?? 0}
        ozTamam={ilerleme?.ozTamamlar.size ?? 0}
        ozToplam={ilerleme?.katilimcilar.length ?? katilimciSayisi ?? 0}
        gorus={ilerleme?.toplamPuan ?? 0}
        dalgaAd={acikDalga?.name ?? null}
      />

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
        <section className="space-y-5 rounded-2xl border-2 border-red-500/30 bg-red-950/10 p-5">
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
            />
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

          {/* #9 Prova Modu — canlı/test ayrımı kritik bir anahtar */}
          <div className="rounded-xl bg-midnight-card/60 p-5 ring-1 ring-royal/30">
            <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-100">
              {tr.provaModu.baslikKapali}
              <Ipucu {...tr.admin.yardim.prova} />
            </h3>
            <ProvaModuKontrol acik={provaAcik} />
          </div>

          {/* FAZ 0 — Pusula penceresi + oda QR kodu (kampa giriş kilidi) */}
          <div className="rounded-xl bg-midnight-card/60 p-5 ring-1 ring-royal/30">
            <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-100">
              {tr.admin.fazSifir.baslik}
              <Ipucu {...tr.admin.yardim.fazSifir} />
            </h3>
            <FazSifirKontrol />
          </div>

          {/* FAZ 1 — Boşluk Anı penceresi + derinlik panosu */}
          <div className="rounded-xl bg-midnight-card/60 p-5 ring-1 ring-royal/30">
            <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-100">
              {tr.admin.fazBir.baslik}
              <Ipucu {...tr.admin.yardim.fazBir} />
            </h3>
            <BoslukKontrol />
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
        <Katlanir baslik={tr.admin.araclar.baslik} aciklama={tr.admin.araclar.aciklama} yardim={tr.admin.yardim.araclar}>
          <HazirlikPaneli />
          <KodBul />
          <DuyuruSablonlari />

          {/* FAZ 2 — Ödev paketi (kamp sonrası 10/15 gün, Ağustos) */}
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

          {/* #10 İşlem günlüğü: kritik eylemler buraya düşer; geri-al ise eylem
              anındaki tostta sunulur (dalga/rapor). Kayıt + geri-al birlikte. */}
          <IslemGunlugu />
        </Katlanir>
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
