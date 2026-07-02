import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { kampKilitliMi } from "@/lib/pusula";
import { aktifOzellikler } from "@/lib/degerlendirme";
import { gorevAraligiDk } from "@/lib/ayna";
import { unvanBul, UNVANLAR } from "@/lib/kivilcim";
import { ZORLUK_ETIKETI, type Zorluk } from "@/lib/davranis";
import { haftaBaslangici } from "@/lib/momentum";
import { kampGunu } from "@/lib/kampProgrami";
import { kampBaslangicGetir } from "@/lib/kampZaman";
import { tr } from "@/lib/i18n/tr";

// Görevin geldiği kamp günü + saati (prova'da issued_at = sanal saat → doğru
// kamp günü/saati görünür). Kamp gününe denk gelmezse hafta günü + saat.
function gelisZamani(iso: string, baslangic?: string): string {
  const d = new Date(iso);
  const tarih = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(d);
  const saat = new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
  const gun = kampGunu(tarih, baslangic);
  if (gun) return `Gün ${gun} · ${saat}`;
  const gunAd = new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul",
    weekday: "long",
  }).format(d);
  return `${gunAd} · ${saat}`;
}
import GorevYanitFormu from "./GorevYanitFormu";
import TanikOnay from "./TanikOnay";
import ZorlastirButonu from "./ZorlastirButonu";
import HafifletButonu from "./HafifletButonu";
import BaslaButonu from "./BaslaButonu";
import ErteleButonu from "./ErteleButonu";
import GorevGecmisi from "./GorevGecmisi";
import NetlestirButonu from "./NetlestirButonu";
import SayacSerit from "./SayacSerit";
import MentorSec from "./MentorSec";
import { atmosferBul } from "@/lib/gorevTasarim";
import SesCal from "@/components/SesCal";
import GorevSesButonu from "@/components/GorevSesButonu";
import BosGorevDurumu from "./BosGorevDurumu";
import DurumSeridi from "./DurumSeridi";
import EkstraGorev from "./EkstraGorev";
import GorevSayac from "./GorevSayac";
import TelafiSayac from "./TelafiSayac";
import UnvanKutlama from "@/components/UnvanKutlama";
import SomutlukChecklist from "./SomutlukChecklist";
import GercekMiydiSoru from "./GercekMiydiSoru";
import KapiSecimi from "./KapiSecimi";
import NedenButonlari from "./NedenButonlari";

export const metadata = { title: "AYNA'nın Görevleri — Liderlik Aynası" };

const t = tr.gorevler;

// (Tür rozet renkleri artık lib/gorevTasarim.ts'teki GOREV_ATMOSFER'den —
// ikon + aksan + üst şerit ile birlikte tek görsel kimlik.)

export default async function GorevlerPage() {
  const session = await getSession();
  if (!session) redirect("/giris");
  if (session.rol !== "participant") redirect("/admin");

  const db = supabaseAdmin();
  // FAZ 0: kamp açılmadan görev sistemi kilitli — bekleme ekranına dön.
  if (await kampKilitliMi(db, session.sub)) redirect("/pusula");
  const { data: gorevler, error } = await db
    .from("missions")
    .select(
      "id, kind, title, body, status, issued_at, due_at, scored_at, response_text, ai_score, ai_comment, spark_points, voice_path, difficulty, neden, fayda, ipuclari, micro_sprint, started_at, ertelenme_sayisi, gec_tamamlandi, trait_id, somutluk, altin, secim_grubu, kapi_etiket"
    )
    .eq("participant_id", session.sub)
    .order("issued_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  const kampBaslangic = await kampBaslangicGetir(db);

  const aktif = (gorevler ?? []).filter((g) => g.status === "pending");
  // FAZ 5.4 — İKİ KAPI: seçim bekleyen kapı görevleri (secim_grubu'na göre).
  const kapiAdaylari = (gorevler ?? []).filter(
    (g) => g.status === "secim_bekliyor" && (g as { kapi_etiket?: string | null }).kapi_etiket
  );
  // Kamp boyu sıra numarası (en eskiden en yeniye 1, 2, 3…) — katılımcı isteği:
  // "1. ödevin, 2. ödevin" diye numara görsün. `gorevler` en yeniden en eskiye
  // sıralı geldiği için ters çevirip numaralıyoruz (limit 50 — 3 günlük kampta
  // kişi başı görev sayısı bunu aşmaz).
  const numaraMap = new Map<string, number>();
  [...(gorevler ?? [])].reverse().forEach((g, i) => numaraMap.set(g.id, i + 1));
  // UX #3 — Telafi: süresi YENİ geçmiş (24 saat içinde), telafi edilebilir
  // görevler ayrı bir bölümde forma açık kalır. Söz/senkron telafi edilmez.
  const simdiMs = new Date().getTime();
  const telafiEdilebilir = (g: { status: string; kind: string; due_at: string }) =>
    g.status === "expired" &&
    g.kind !== "soz" &&
    g.kind !== "senkron" &&
    simdiMs - new Date(g.due_at).getTime() <= 24 * 3_600_000;
  const telafiGorevler = (gorevler ?? []).filter(telafiEdilebilir);
  const gecmis = (gorevler ?? []).filter(
    (g) => g.status !== "pending" && !telafiEdilebilir(g)
  );

  // #9 Mentorluk: aktif mentorluk görevleri için önerilen adayları + seçimi yükle.
  const mentorVeri = new Map<string, { adaylar: { id: string; ad: string }[]; secilen: string | null }>();
  const mentorlukAktif = aktif.filter((g) => g.kind === "mentorluk");
  if (mentorlukAktif.length > 0) {
    const { data: kayitlar } = await db
      .from("mentorluk_kayit")
      .select("mission_id, aday_idler, secilen_id")
      .in("mission_id", mentorlukAktif.map((g) => g.id))
      .eq("mentee_id", session.sub);
    const tumIdler = [...new Set((kayitlar ?? []).flatMap((k) => (k.aday_idler as string[]) ?? []))];
    const adMap = new Map<string, string>();
    if (tumIdler.length > 0) {
      const { data: kisiler } = await db
        .from("participants")
        .select("id, full_name")
        .in("id", tumIdler);
      for (const p of kisiler ?? []) adMap.set(p.id, p.full_name);
    }
    for (const k of kayitlar ?? []) {
      if (!k.mission_id) continue;
      mentorVeri.set(k.mission_id, {
        adaylar: ((k.aday_idler as string[]) ?? []).map((id) => ({ id, ad: adMap.get(id) ?? "—" })),
        secilen: k.secilen_id,
      });
    }
  }

  // YANSIMAN fısıltıları: aktif görevlerin ses dosyalarına kısa ömürlü imzalı URL
  const sesUrller = new Map<string, string>();
  for (const g of aktif) {
    if (!g.voice_path) continue;
    const { data: imzali } = await db.storage
      .from("sesler")
      .createSignedUrl(g.voice_path, 3600);
    if (imzali) sesUrller.set(g.id, imzali.signedUrl);
  }
  // Haftalık Momentum (varsa) — davranış eğilimi katılımcıya da görünür
  const { data: momentum } = await db
    .from("momentum_scores")
    .select("score")
    .eq("participant_id", session.sub)
    .eq("week_start", haftaBaslangici(new Date()))
    .maybeSingle();

  const toplamKivilcim = (gorevler ?? [])
    .filter((g) => g.status === "scored")
    .reduce((top, g) => top + g.spark_points, 0);
  const unvan = unvanBul(toplamKivilcim);
  const unvanSeviye = UNVANLAR.findIndex((u) => u.ad === unvan.mevcut.ad);
  // UX #2: unvan ilerleme oranı (mevcut eşik → sonraki eşik). Son unvanda %100.
  const unvanTaban = unvan.mevcut.esik;
  const unvanTavan = unvan.sonraki?.esik ?? unvanTaban;
  const unvanYuzde =
    unvan.sonraki && unvanTavan > unvanTaban
      ? Math.min(100, Math.max(3, Math.round(((toplamKivilcim - unvanTaban) / (unvanTavan - unvanTaban)) * 100)))
      : 100;

  // #5 Günlük check-in: bugün yapıldı mı + özellik seçenekleri
  const bugun = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
  }).format(new Date());
  const bugunBas = new Date(`${bugun}T00:00:00+03:00`).toISOString();
  const [ozellikler, { count: bugunTakdir }] = await Promise.all([
    aktifOzellikler(db),
    db
      .from("kudos")
      .select("id", { count: "exact", head: true })
      .eq("to_id", session.sub)
      .gte("created_at", bugunBas),
  ]);

  // #5 Tanıklık: bana gelen tanıklık çağrıları + tamamladığım görevlere gelen
  // anonim gözlemler. (Kendi görevime tanık ÇAĞIRMA widget'ı kaldırıldı —
  // kart kalabalığı yaratıyordu; bu gelen-taraf akış hâlâ geçerli.)
  const [{ data: bekleyenHam }, { data: gelenHam }] = await Promise.all([
    db
      .from("gorev_tanik")
      .select("id, doer:participants!gorev_tanik_doer_id_fkey(full_name)")
      .eq("witness_id", session.sub)
      .is("confirmed_at", null),
    db
      .from("gorev_tanik")
      .select("mission_id, observation")
      .eq("doer_id", session.sub)
      .not("confirmed_at", "is", null),
  ]);
  const bekleyenler = (bekleyenHam ?? [])
    .filter((b) => b.doer)
    .map((b) => ({
      id: b.id,
      doerAd: (b.doer as unknown as { full_name: string }).full_name.split(" ")[0],
    }));
  const gelenGozlem = new Map<string, string>();
  for (const g of gelenHam ?? []) if (g.observation) gelenGozlem.set(g.mission_id, g.observation);

  // FAZ 1.3 — eşleşme dengeleyici: teslim edilmiş (scored) eşleşmeli görevler
  // için henüz cevaplanmamış "gerçek miydi?" sorusu.
  const { data: gercekMiydiHam } = await db
    .from("gorev_eslesme")
    .select("mission_id")
    .eq("kaynak_id", session.sub)
    .is("gercek_miydi", null);
  const gercekMiydiBekleyen = (gercekMiydiHam ?? [])
    .map((r) => (gorevler ?? []).find((g) => g.id === r.mission_id && g.status === "scored"))
    .filter((g): g is NonNullable<typeof g> => !!g);

  // #4 Bugünün özeti
  const bugunScored = (gorevler ?? []).filter(
    (g) => g.status === "scored" && g.scored_at && g.scored_at >= bugunBas
  );
  const bugunGorev = bugunScored.length;
  const bugunKivilcim = bugunScored.reduce((t, g) => t + (g.spark_points ?? 0), 0);
  const bugunTakdirSayi = bugunTakdir ?? 0;
  const ozetVar = bugunGorev > 0 || bugunTakdirSayi > 0;

  // #6 Seri ateşi: en son kapanan görevlerden geriye doğru kesintisiz "scored"
  // sayısı (ilk "expired"de seri kırılır). 3+ olunca momentum banner'ı çıkar.
  let seri = 0;
  for (const g of gecmis) {
    if (g.status === "scored") seri++;
    else break;
  }

  // A2: görevin çalıştırdığı liderlik kası (trait_id → ad).
  const ozellikAd = new Map(ozellikler.map((o) => [o.id, o.name]));
  // A1: seri kırılma riski — serin var ama bugün henüz görev kapatmadın.
  const seriRiski = seri >= 2 && bugunGorev === 0;
  // A7: aşırı yük koruması — bugün çok görev yaptıysan dinlenmeye davet.
  const yeterince = aktif.length === 0 && bugunGorev >= 5;

  // UX #1/#3: günün ritmi + "sıradaki görev ~N dk" tahmini (boş durumu canlandırır).
  const GUNLUK_KOTA = 7;
  const sonGorevZamani = (gorevler ?? [])[0]?.issued_at ?? null;
  let siradakiDk: number | null = null;
  if (sonGorevZamani) {
    const aralik = gorevAraligiDk(session.sub, bugunGorev, false);
    const kalanMs = new Date(sonGorevZamani).getTime() + aralik * 60_000 - simdiMs;
    siradakiDk = kalanMs > 60_000 ? Math.ceil(kalanMs / 60_000) : 0;
  }
  // FAZ 5.1 — GÖREV FRAGMANI: kişi+bugünkü görev sayısı tohumlu, deterministik
  // ama gün içinde değişen jenerik ipucu (gerçek içeriği asla açık etmez).
  const ipucuHavuzu = t.fragmanIpucuHavuzu;
  let ipucuTohum = 0;
  for (const ch of `${session.sub}:${bugunGorev}`) ipucuTohum = (ipucuTohum * 31 + ch.charCodeAt(0)) % ipucuHavuzu.length;
  const fragmanIpucu = ipucuHavuzu[ipucuTohum];

  // (Geçmiş zaman çizelgesi gruplaması artık GorevGecmisi client bileşeninde —
  // filtre + özet için.)

  // Bir aktif görevin TAM detaylı kartı — hem tek başına (en son gelen görev
  // için, vurgu=true) hem akordeonun kapalı satırı açılınca (vurgu=false)
  // kullanılır. Aynı işi iki yerde tekrar yazmamak için fonksiyona çıkarıldı.
  function GorevKarti({ g, vurgu }: { g: (typeof aktif)[number]; vurgu: boolean }) {
    const altinMi = !!(g as { altin?: boolean }).altin;
    const atm = atmosferBul(g.kind, altinMi);
    const zorluk = (g.difficulty as Zorluk) ?? 2;
    return (
      <section
        className={`gorev-giris relative overflow-hidden kart-3d rounded-2xl ${atm.arka} p-5 pt-6 shadow-xl ring-1 ${atm.halka} backdrop-blur`}
      >
        {/* FAZ 5.2 — ALTIN GÖREV rozeti: nadir, 3x kıvılcım */}
        {altinMi && (
          <p className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-gold/30 px-3 py-1 text-xs font-bold uppercase tracking-widest text-gold-light ring-1 ring-gold/50">
            ⚡ Altın Görev · 3× kıvılcım
          </p>
        )}
        {/* UX #6: üst kenarda boşalan sayaç şeridi (türe göre değil zamana göre) */}
        <SayacSerit baslangic={g.issued_at} bitis={g.due_at} sakin={!!g.started_at} />
        {/* UX #1 (tasarım): türe özel üst atmosfer parıltısı */}
        <span
          className={`pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b ${atm.serit} opacity-60`}
          aria-hidden
        />
        <div className="relative">
        {vurgu && (
          <p className="mb-2 inline-block rounded-full bg-gold/20 px-3 py-1 text-xs font-bold tracking-wide text-gold-light">
            {tr.degerlendir.simdiSira}
          </p>
        )}
        <div className="flex items-center justify-between text-xs">
          <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-medium ${atm.rozet}`}>
            <span aria-hidden>{atm.ikon}</span>
            {t.turler[g.kind as keyof typeof t.turler] ?? g.kind}
          </span>
          <GorevSayac baslangic={g.issued_at} bitis={g.due_at} sakin={!!g.started_at} />
        </div>
        {/* Görevin geldiği gün + saat (katılımcı isteği) */}
        <p className="mt-1.5 text-xs font-medium text-slate-400">
          📅 {gelisZamani(g.issued_at, kampBaslangic)} geldi
        </p>
        {/* UX #3: zorluk sembol (pip) + kas + mikro-sprint */}
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          <span className="inline-flex items-center gap-1" title={ZORLUK_ETIKETI[zorluk]}>
            {[1, 2, 3].map((n) => (
              <span
                key={n}
                className={`h-2 w-2 rounded-full ${n <= zorluk ? "bg-sky-300" : "bg-white/15"}`}
                aria-hidden
              />
            ))}
            <span className="ml-1 text-xs text-slate-400">{ZORLUK_ETIKETI[zorluk]}</span>
          </span>
          {g.trait_id && ozellikAd.has(g.trait_id) && (
            <span className="inline-block rounded-full bg-royal/30 px-2 py-0.5 text-xs font-medium text-royal-light">
              💪 {ozellikAd.get(g.trait_id)}
            </span>
          )}
          {g.micro_sprint && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/25 px-2 py-0.5 text-xs font-bold text-amber-300 ring-1 ring-amber-400/40">
              <span className="animate-pulse" aria-hidden>⚡</span> 30 DAKİKA — ŞİMDİ
            </span>
          )}
        </div>
        {/* UX #10: AYNA sesi için belirgin başlık tipografisi */}
        <h2 className="font-display mt-3 text-[1.7rem] font-bold leading-tight text-gold-light">{g.title}</h2>

        {/* ✨ NEDEN SEN — başlığın hemen altında, her zaman açık, gold kart.
            Kişiye özel motivasyon; görev isteğini doğrudan artırır. */}
        {g.neden && (
          <div className="mt-3 rounded-2xl border border-gold/40 bg-gold/[0.10] p-4 shadow-[0_0_20px_-6px_rgba(212,175,55,0.25)]">
            <p className="text-xs font-bold uppercase tracking-widest text-gold">✨ Bu görev neden sana verildi?</p>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-100">{g.neden}</p>
          </div>
        )}

        {/* 💡 İŞİNE KATKISI — neden'in hemen altında, her zaman açık, emerald kart. */}
        {g.fayda && (
          <div className="mt-3 rounded-2xl border border-emerald-400/35 bg-emerald-400/[0.09] p-4">
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-300">💡 İşine nasıl katkı sağlar?</p>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-100">{g.fayda}</p>
          </div>
        )}

        <p className="mt-4 whitespace-pre-wrap text-base leading-relaxed text-slate-100">
          {g.body}
        </p>
        {/* FAZ 1.1: gövdeyi 5 satırlık somutluk checklist'ine ayrıştırır */}
        <SomutlukChecklist
          somutluk={
            g.somutluk as { kim: string | null; ne: string; nerede: string; neZaman: string; kanit: string } | null
          }
        />
        {/* Düşük puan sonrası derinleştirme görevi: "bu sefer şunu dene" ipuçları */}
        {Array.isArray(g.ipuclari) && g.ipuclari.length > 0 && (
          <div className="mt-4 rounded-2xl border border-sky-400/30 bg-sky-400/[0.08] p-4">
            <p className="text-xs font-bold uppercase tracking-widest text-sky-300">
              🎯 Bu sefer şunu dene
            </p>
            <ul className="mt-2 space-y-1.5">
              {g.ipuclari.map((ip: string, i: number) => (
                <li key={i} className="flex gap-2 text-sm leading-relaxed text-slate-200">
                  <span className="text-sky-300" aria-hidden>›</span>
                  <span>{ip}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {sesUrller.has(g.id) ? (
          <SesCal
            url={sesUrller.get(g.id)!}
            etiket={g.kind === "simulasyon" ? t.dinleItiraz : t.dinle}
          />
        ) : (
          <GorevSesButonu gorevId={g.id} metin={`${g.title}. ${g.body}`} />
        )}
        {/* #9: mentorluk görevinde 3 adaydan yapılandırılmış seçim */}
        {g.kind === "mentorluk" && mentorVeri.has(g.id) && (
          <MentorSec
            missionId={g.id}
            adaylar={mentorVeri.get(g.id)!.adaylar}
            secilen={mentorVeri.get(g.id)!.secilen}
          />
        )}
        {/* UX #1: "Başladım" — birincil-yakını, görünür kalır (söz/senkron hariç) */}
        {g.kind !== "soz" && g.kind !== "senkron" && (
          <BaslaButonu gorevId={g.id} basladiMi={!!g.started_at} />
        )}
        {/* UX #2 (tasarım): birincil eylem (yanıt) baskın; ikincil eylemler
            tek "⋯ Seçenekler" altında toplanır — kart dağınıklığı biter. */}
        <GorevYanitFormu gorevId={g.id} gorevBaslik={g.title} />
        {g.kind !== "soz" && g.kind !== "senkron" && (
          <details className="group mt-3">
            <summary className="flex cursor-pointer list-none items-center justify-center gap-1 text-xs font-medium text-slate-500 transition-colors hover:text-slate-300">
              ⋯ {t.secenekler}
              <span className="transition-transform group-open:rotate-180" aria-hidden>▾</span>
            </summary>
            <div className="mt-2 space-y-1">
              {/* A10: belirsiz görevde netleştirme */}
              <NetlestirButonu gorevId={g.id} />
              {/* #6 Zorlaştır — üst kademede değilse */}
              {(g.difficulty ?? 2) < 3 && <ZorlastirButonu gorevId={g.id} />}
              {/* #8 "ağır geldi" → yumuşat */}
              <HafifletButonu gorevId={g.id} />
              {/* UX #2: ertele (en fazla 2 kez) */}
              <ErteleButonu gorevId={g.id} kalanHak={2 - (g.ertelenme_sayisi ?? 0)} />
              {/* A6: takılan kişi için Koç köprüsü */}
              <Link
                href="/kocu"
                className="block text-center text-xs text-slate-500 underline-offset-4 transition-colors hover:text-royal-light"
              >
                {t.koctanYardim}
              </Link>
            </div>
          </details>
        )}
        </div>
      </section>
    );
  }

  return (
    <main className="flex min-h-dvh flex-col overflow-y-auto">
      <div className="sahne-giris mx-auto w-full max-w-md space-y-4 p-5">
      <UnvanKutlama unvan={unvan.mevcut.ad} seviye={unvanSeviye} />
      {/* Başlık sadeleşti: tek satır, alt açıklama kaldırıldı (geri butonu da —
          alt nav'da "Ana sayfa" zaten var). */}
      <header>
        <h1 className="font-display altin-metin text-2xl font-bold leading-tight">{t.baslik}</h1>
      </header>

      {/* Tek konsolide DURUM ŞERİDİ — unvan/ilerleme + günün ritmi + kampın nabzı
          + bugün özeti hepsi burada; aktif görev varken kapalı gelir (odak göreve). */}
      <DurumSeridi
        kivilcim={toplamKivilcim}
        unvanAd={unvan.mevcut.ad}
        unvanYuzde={unvanYuzde}
        sonrakiMetin={unvan.sonraki ? tr.kivilcim.sonrakiUnvan(unvan.sonraki.ad, unvan.kalan) : null}
        zirveMetin={unvan.sonraki ? null : t.unvanZirve}
        bugunGorev={bugunGorev}
        gunlukKota={GUNLUK_KOTA}
        ozetMetin={ozetVar ? t.bugunOzet(bugunGorev, bugunKivilcim, bugunTakdirSayi) : null}
        seriMetin={seri >= 3 ? t.seriAtesi(seri) : null}
        seriRiski={seriRiski}
        aktifVar={aktif.length > 0}
      />

      {/* FAZ 5.4 — İKİ KAPI: seçim bekleyen kapılar (aktif görevden önce) */}
      {kapiAdaylari.length > 0 && (
        <KapiSecimi
          kapilar={kapiAdaylari.map((g) => ({
            id: g.id,
            etiket: (g as { kapi_etiket?: string | null }).kapi_etiket ?? "Kapı",
          }))}
        />
      )}

      {/* FAZ 1.3 — teslim ettiğin eşleşmeli görev(ler) için "gerçek miydi?" sorusu */}
      {gercekMiydiBekleyen.length > 0 && (
        <section className="space-y-2">
          {gercekMiydiBekleyen.map((g) => (
            <GercekMiydiSoru key={g.id} gorevId={g.id} />
          ))}
        </section>
      )}

      {/* #5 Tanıklık bekleyenler — sana gelen tanık çağrıları */}
      {bekleyenler.length > 0 && (
        <section className="rounded-2xl border border-royal-light/30 bg-midnight-card/60 p-4 backdrop-blur">
          <p className="text-sm font-semibold text-gold-light">{t.tanikBekleyenBaslik}</p>
          <ul className="mt-3 space-y-4">
            {bekleyenler.map((b) => (
              <li key={b.id}>
                <TanikOnay tanikId={b.id} doerAd={b.doerAd} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* UX #3: Telafi — süresi yeni geçmiş görev(ler) forma açık kalır */}
      {telafiGorevler.length > 0 && (
        <section className="space-y-4">
          {telafiGorevler.map((g) => (
            <div
              key={g.id}
              className="kart-3d rounded-2xl border border-amber-400/30 bg-amber-500/[0.06] p-5"
            >
              <p className="inline-block rounded-full bg-amber-500/20 px-3 py-1 text-xs font-bold tracking-wide text-amber-300">
                ⏳ {t.telafiRozet}
              </p>
              <h2 className="mt-2 text-xl font-bold leading-snug text-amber-100">{g.title}</h2>
              {g.neden && (
                <div className="mt-3 rounded-xl border border-gold/35 bg-gold/[0.09] p-3">
                  <p className="text-xs font-bold uppercase tracking-widest text-gold">✨ Bu görev neden sana verildi?</p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-100">{g.neden}</p>
                </div>
              )}
              {g.fayda && (
                <div className="mt-2 rounded-xl border border-emerald-400/30 bg-emerald-400/[0.08] p-3">
                  <p className="text-xs font-bold uppercase tracking-widest text-emerald-300">💡 İşine nasıl katkı sağlar?</p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-100">{g.fayda}</p>
                </div>
              )}
              <p className="mt-3 whitespace-pre-wrap text-base leading-relaxed text-slate-200">
                {g.body}
              </p>
              <p className="mt-3 rounded-xl border border-amber-400/20 bg-midnight/30 p-3 text-sm leading-relaxed text-amber-200/90">
                {t.telafiAciklama}
              </p>
              {/* UX #3 — telafi penceresinin canlı geri sayımı (due_at + 24sa) */}
              <TelafiSayac bitis={new Date(new Date(g.due_at).getTime() + 24 * 3_600_000).toISOString()} />
              <GorevYanitFormu gorevId={g.id} gorevBaslik={g.title} />
              {/* FAZ 7.2 — "Neden?" tek dokunuş: sonraki görevi kişiye göre biçimler */}
              <NedenButonlari gorevId={g.id} />
            </div>
          ))}
        </section>
      )}

      {/* Aktif görev(ler) */}
      {aktif.length === 0 && yeterince ? (
        /* A7: aşırı yük koruması — bugün çok görev yaptın, dinlen */
        <section className="kart-cam rounded-3xl p-8 text-center ring-1 ring-emerald-400/25">
          <p className="text-5xl" aria-hidden>🌿</p>
          <h2 className="prizma-serif ay-metin mt-3 text-2xl font-semibold">{t.yeterinceBaslik}</h2>
          <p className="mt-3 text-base leading-relaxed text-slate-300">{t.yeterinceMetin(bugunGorev)}</p>
          {/* Boş zamanı/istekliliği olan ekstra görevle puanını artırabilsin */}
          <div className="mx-auto mt-5 w-full max-w-sm">
            <EkstraGorev ikincil />
            <p className="mt-1.5 text-xs text-slate-500">{t.ekstraNot}</p>
          </div>
        </section>
      ) : aktif.length === 0 ? (
        <BosGorevDurumu siradakiDk={siradakiDk} fragmanIpucu={fragmanIpucu} />
      ) : (
        <>
          {/* En son gelen görev — TEK odak, tam açık. */}
          <GorevKarti g={aktif[0]} vurgu />

          {/* Diğer bekleyen görevler — katılımcı isteği: birden fazla görev
              varken ekran karışıyordu. Artık numaralı + KAPALI akordeon;
              dokununca aynı tam detaylı kartı açar. Biri tamamlanınca (sayfa
              yeniden render olunca) bir öncekinin sırası otomatik öne gelir. */}
          {aktif.length > 1 && (
            <section className="space-y-2">
              <p className="px-1 text-xs font-medium text-slate-500">
                {t.digerBekleyen(aktif.length - 1)}
              </p>
              {aktif.slice(1).map((g) => (
                <details
                  key={g.id}
                  className="group overflow-hidden rounded-2xl border border-white/10 bg-midnight-card/40"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-4">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-xs font-bold text-slate-300">
                        {t.odevNo(numaraMap.get(g.id) ?? 0)}
                      </span>
                      <span className="truncate text-sm font-medium text-slate-200">{g.title}</span>
                    </span>
                    <span
                      className="shrink-0 text-slate-500 transition-transform group-open:rotate-180"
                      aria-hidden
                    >
                      ▾
                    </span>
                  </summary>
                  <div className="border-t border-white/10 p-2">
                    <GorevKarti g={g} vurgu={false} />
                  </div>
                </details>
              ))}
            </section>
          )}
        </>
      )}

      {/* Geçmiş — A8 filtre + özet, A2 liderlik kası (client bileşeni) */}
      <GorevGecmisi
        gorevler={gecmis.map((g) => ({
          id: g.id,
          kind: g.kind,
          title: g.title,
          status: g.status,
          ai_score: g.ai_score,
          spark_points: g.spark_points,
          ai_comment: g.ai_comment,
          scored_at: g.scored_at,
          issued_at: g.issued_at,
          trait_id: g.trait_id,
          gozlem: gelenGozlem.get(g.id) ?? null,
          response_text: g.response_text,
          neden: g.neden ?? null,
          fayda: g.fayda ?? null,
        }))}
        ozellikAd={Object.fromEntries(ozellikAd)}
      />
      </div>
    </main>
  );
}
