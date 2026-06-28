import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { aktifOzellikler } from "@/lib/degerlendirme";
import { raporlarGorunurMu } from "@/lib/rapor";
import { adminOnerisi } from "@/lib/adminAsistan";
import { adminUyarilari } from "@/lib/adminUyarilar";
import { funnelMetrikleri } from "@/lib/funnel";
import { tr } from "@/lib/i18n/tr";
import { kampGunu, KAMP_GUNLERI } from "@/lib/kampProgrami";
import FunnelOmurga from "./FunnelOmurga";
import OtoYenile from "./OtoYenile";
import GununAkisi from "./GununAkisi";
import CanliOzet from "./CanliOzet";
import Uyarilar from "./Uyarilar";
import Ipucu from "./Ipucu";
import AltAksiyonCubugu from "./AltAksiyonCubugu";
import SonEylemler from "./SonEylemler";
import FunnelMetrik from "./FunnelMetrik";
import Katlanir from "./Katlanir";
import OneriButonu from "./OneriButonu";
import BasitEylem from "./BasitEylem";
import GecisHazirlik from "./GecisHazirlik";
import HazirlikPaneli from "./HazirlikPaneli";
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
    db.from("waves").select("id, name, is_open, opened_at, closed_at").order("id"),
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
      .in("key", ["muhur_acik", "reports_visible"]),
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

  // Funnel: kamp öncesi katılım hunisinin dönüşümü (kim nerede takıldı).
  const funnel = await funnelMetrikleri(db);

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
  const muhurAcik = funnelAyar.get("muhur_acik") === "true";
  const aktifAsama =
    bugun > sonKampGun
      ? 5
      : raporlarAcik || muhurAcik || sozAcik
        ? 4
        : acikDalga || kampGun != null
          ? 3
          : katilimciSayisi && katilimciSayisi > 0
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
  const z2 = katilimciSayisi && katilimciSayisi > 0 ? "katılımcı var" : null;
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
    degerlendirmeKapandi: (() => {
      const kd = dalgalar.find((d) => d.id === 1);
      return !!kd && !kd.is_open && !!kd.closed_at;
    })(),
    raporlarAcik,
    sozAcik,
    pusulaAcik: true,
    hazirTamam: funnel.adimlar.find((a) => a.anahtar === "onfark")?.sayi ?? 0,
    onFarkAcik: true,
  });

  // UX #4+#9 — Bu aşamaya hazırlık skoru + geçiş checklist'i.
  const hazirTamamSayi = funnel.adimlar.find((a) => a.anahtar === "onfark")?.sayi ?? 0;
  const ozTamamSayi = ilerleme?.ozTamamlar.size ?? 0;
  const ozToplamSayi = ilerleme?.katilimcilar.length ?? katilimciSayisi ?? 0;
  const kSayi = katilimciSayisi ?? 0;
  const gecisKontroller =
    aktifAsama <= 2
      ? [
          { ad: "Katılımcı listesi yüklendi", tamam: kSayi > 0 },
          { ad: "Hazırlığı bitiren ≥ %80", tamam: kSayi > 0 && hazirTamamSayi / kSayi >= 0.8 },
        ]
      : aktifAsama === 3
        ? [
            { ad: "Bir dalga açık", tamam: !!acikDalga },
            {
              ad: "Çoğunluk kendini puanladı (≥ %80)",
              tamam: ozToplamSayi > 0 && ozTamamSayi / ozToplamSayi >= 0.8,
            },
          ]
        : aktifAsama === 4
          ? [
              { ad: "Ayna mektupları hazır", tamam: kSayi > 0 && (mektupSayisi ?? 0) >= kSayi },
              { ad: "Ayna Raporları açık", tamam: raporlarAcik },
            ]
          : [];
  const gecisBaslik =
    aktifAsama <= 2
      ? "Kampa hazırlık"
      : aktifAsama === 3
        ? "Bugünün dalgası"
        : aktifAsama === 4
          ? "Kapanışa hazırlık"
          : "";

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

  return (
    // #8 Mobilde alt sabit aksiyon çubuğu içeriği örtmesin: alt nefes payı.
    <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 p-4 pb-28 sm:p-6 sm:pb-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-gold">{tr.admin.baslik}</h1>
          <Ipucu {...tr.admin.yardim.panel} />
        </div>
        <OtoYenile />
      </div>

      <FunnelOmurga aktif={aktifAsama} zamanlar={asamaZaman} />

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

        {!oneri.vurgu && (
          <p className="mt-3 text-center text-xs text-emerald-300/80">
            ✓ Şu an acil bir şey yok — her şey yolunda. Hazır olduğunda yukarıdaki adımı at.
          </p>
        )}
      </section>

      {/* UX #4/#9 aşama hazırlık skoru — dalga süre artık nav rozetinde */}
      {tamYetki && gecisKontroller.length > 0 && (
        <GecisHazirlik baslik={gecisBaslik} kontroller={gecisKontroller} />
      )}

      {/* Kamp/prova öncesi tam sağlık kontrolü (katılımcı, eşleştirme, dalga,
          AYNA zekâsı, VAPID anahtarı, bildirim abonesi). Eskiden hiç render
          edilmiyordu — bildirim altyapısı görünmez kalıyordu. Katlanır. */}
      {tamYetki && (
        <Katlanir baslik="Kamp hazırlık kontrolü" ikon="✅">
          <HazirlikPaneli konum="arac" aktifAsama={aktifAsama} />
        </Katlanir>
      )}

      {/* GENEL DURUM: canlı özet rakamları */}
      <section className="kart-3d space-y-4 rounded-2xl bg-midnight-card/60 p-5 shadow-xl ring-1 ring-royal/30 backdrop-blur">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gold-light">
            {tr.admin.ozet.genelBaslik}
          </h2>
          <Ipucu {...tr.admin.yardim.panelOzet} />
        </div>
        <CanliOzet
          ciplak
          katilimci={katilimciSayisi ?? 0}
          ozTamam={ilerleme?.ozTamamlar.size ?? 0}
          ozToplam={ilerleme?.katilimcilar.length ?? katilimciSayisi ?? 0}
          gorus={ilerleme?.toplamPuan ?? 0}
          dalgaAd={acikDalga?.name ?? null}
        />
        {/* Dönüşüm hunisi metriği */}
        {funnel.toplam > 0 && (
          <>
            <div className="h-px bg-white/10" />
            <div className="mt-4" />
            <FunnelMetrik ciplak ozet={funnel} />
          </>
        )}
      </section>

      {/* Etkinlik akışı + uyarılar — katlanır panel */}
      <Katlanir baslik="Etkinlik & Uyarılar" ikon="📋">
        <>
          {tamYetki && (
            <div className="space-y-3">
              <SonEylemler />
              <Uyarilar uyarilar={uyarilar} />
            </div>
          )}
          {kampGun !== null && <GununAkisi bugun={bugun} />}
        </>
      </Katlanir>

      {/* İlerleme özeti — detay Sağlık sayfasında */}
      <Link
        id="ilerleme"
        href="/admin/saglik"
        className="scroll-mt-20 flex items-center justify-between gap-4 rounded-2xl bg-midnight-card/60 px-5 py-4 ring-1 ring-royal/30 transition-colors hover:bg-midnight-card/80"
      >
        <div>
          <p className="text-sm font-semibold text-slate-200">{tr.admin.ilerleme.baslik}</p>
          {acikDalga ? (
            <p className="mt-0.5 text-xs text-slate-400">
              {ilerleme
                ? `${ilerleme.ozTamamlar.size}/${ilerleme.katilimcilar.length} kişi kendini puanladı · ${ilerleme.toplamPuan} toplam görüş`
                : "Dalga açık"}
              {" "}· {acikDalga.name}
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-slate-500">Açık dalga yok</p>
          )}
        </div>
        <span className="shrink-0 text-sm font-medium text-gold-light">Sağlık →</span>
      </Link>

      {/* Sistem özeti — sorun varsa göster, yoksa yön gösterici. */}
      {tamYetki && ((bekleyenFoto ?? 0) > 0 || silmeBekleyen > 0) ? (
        <div className="flex flex-wrap gap-2">
          {(bekleyenFoto ?? 0) > 0 && (
            <Link
              href="/admin/moderasyon"
              className="flex items-center gap-2 rounded-xl bg-amber-500/10 px-4 py-3 text-sm font-medium text-amber-300 ring-1 ring-amber-500/30 transition-colors hover:bg-amber-500/15"
            >
              🖼 {bekleyenFoto ?? 0} bekleyen fotoğraf
            </Link>
          )}
          {silmeBekleyen > 0 && (
            <Link
              href="/admin/sistem#kvkk"
              className="flex items-center gap-2 rounded-xl bg-red-500/10 px-4 py-3 text-sm font-medium text-red-300 ring-1 ring-red-400/30 transition-colors hover:bg-red-500/15"
            >
              ⚠️ {silmeBekleyen} KVKK silme talebi
            </Link>
          )}
        </div>
      ) : tamYetki ? (
        <p className="rounded-xl border border-royal-light/20 bg-white/[0.02] px-4 py-3 text-center text-sm text-slate-400">
          Kontroller: <span className="font-semibold text-gold-light">🧰·🎬·🏁·⚙</span> menüleri · Sorun yok ✓
        </p>
      ) : null}


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
