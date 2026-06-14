import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { acikDalga, aktifOzellikler, ozPuanTamamMi } from "@/lib/degerlendirme";
import { raporlarGorunurMu } from "@/lib/rapor";
import { tr } from "@/lib/i18n/tr";
import AynaKurulum from "@/components/AynaKurulum";
import AynaRituel from "@/components/AynaRituel";
import EgilenKart from "@/components/EgilenKart";
import IlkAdimIpucu from "@/components/IlkAdimIpucu";
import IlkTanitim from "@/components/IlkTanitim";
import YolculukSeridi from "@/components/YolculukSeridi";
import KonusanYansima from "@/components/KonusanYansima";
import SicakAdim from "@/components/SicakAdim";
import UstMenu from "@/components/UstMenu";

const t = tr.anaSayfa;

function Sayfa({
  ust,
  children,
  kurulum = true,
}: {
  ust: React.ReactNode;
  children: React.ReactNode;
  kurulum?: boolean;
}) {
  // Mobil öncelikli düzen kuralı: başlık üstte sabit, tek kart kalan boşlukta
  // DİKEY ORTALANIR, kurulum ipucu altta. `my-auto` az içerikte ekranı
  // ortalar; çok içerik olursa kırpmadan kayar (asla yarım ekran hissi yok).
  return (
    <main className="flex min-h-dvh flex-col overflow-y-auto">
      <IlkTanitim />
      <div className="mx-auto w-full max-w-md shrink-0 px-5 pt-5">{ust}</div>
      <div className="mx-auto my-auto w-full max-w-md px-5 py-5">
        <div className="sahne-giris space-y-5">{children}</div>
      </div>
      {kurulum && (
        <div className="mx-auto w-full max-w-md shrink-0 px-5 pb-5">
          <AynaKurulum />
        </div>
      )}
    </main>
  );
}

function BuyukKart({
  baslik,
  metin,
  href,
  dugme,
  vurgu = false,
}: {
  baslik: string;
  metin: string;
  href: string;
  dugme: string;
  vurgu?: boolean;
}) {
  return (
    <EgilenKart className="rounded-3xl">
      <div className="kart-cam relative overflow-hidden rounded-3xl p-8 text-center">
        <h2 className="prizma-serif ay-metin text-3xl font-semibold leading-tight">
          {baslik}
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-slate-300">{metin}</p>
        <Link
          href={href}
          className={`mt-8 flex h-16 w-full items-center justify-center rounded-2xl text-xl font-bold transition-transform hover:scale-[1.01] ${
            vurgu ? "parilti btn-kor" : "btn-kor"
          }`}
        >
          {dugme}
        </Link>
      </div>
    </EgilenKart>
  );
}

// Açılış ekranı bir DURUM MAKİNESİDİR: kişinin yolculuğunun neresinde olduğuna
// göre TEK bir kart gösterir. İkincil her şey üstteki menüden açılır.
// Öncelik: öz-puan kapısı → ses ritüeli → rapor → kişisel ses → değerlendirme →
// görev → bekleme. "Kendini puanlamadan kamp sana açılmaz."
export default async function AnaSayfa() {
  const session = await getSession();
  if (!session) redirect("/giris");

  const db = supabaseAdmin();
  const [
    dalga,
    raporlarAcik,
    ozellikler,
    { count: aktifGorev },
    { data: sesProfili },
    { data: kayma },
    { data: sozAyar },
    { data: soz },
  ] = await Promise.all([
      acikDalga(db),
      raporlarGorunurMu(db),
      aktifOzellikler(db),
      db
        .from("missions")
        .select("id", { count: "exact", head: true })
        .eq("participant_id", session.sub)
        .eq("status", "pending"),
      db
        .from("voice_profiles")
        .select("status, video_status, video_path, morning_date, night_date")
        .eq("participant_id", session.sub)
        .maybeSingle(),
      db
        .from("churn_radar")
        .select("nudged_at, voice_path")
        .eq("participant_id", session.sub)
        .maybeSingle(),
      db.from("settings").select("value").eq("key", "kapanis_soz_acik").maybeSingle(),
      db
        .from("pledges")
        .select("participant_id")
        .eq("participant_id", session.sub)
        .maybeSingle(),
    ]);
  const sozAcik = sozAyar?.value === "true";
  const sozVar = !!soz;

  const ozTamam = dalga
    ? await ozPuanTamamMi(db, session.sub, dalga.id, ozellikler.length)
    : false;
  const gorevSayisi = aktifGorev ?? 0;
  const yansimanHazir = sesProfili?.video_status === "hazir";

  // ---- Kişisel sesli mesaj (Konuşan Yansıma) tazelik kontrolü ----
  const db2 = db.storage.from("sesler");
  const bugunIst = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
  }).format(new Date());
  // eslint-disable-next-line react-hooks/purity
  const istekAni = Date.now();

  let yansimaVideoUrl: string | null = null;
  if (yansimanHazir && sesProfili?.video_path) {
    const { data } = await db2.createSignedUrl(sesProfili.video_path, 3600);
    yansimaVideoUrl = data?.signedUrl ?? null;
  }

  type SesKart = { baslik: string; renk: string; url: string };
  let sesKart: SesKart | null = null;
  if (
    kayma?.voice_path &&
    kayma.nudged_at &&
    istekAni - new Date(kayma.nudged_at).getTime() < 24 * 3_600_000
  ) {
    const { data } = await db2.createSignedUrl(kayma.voice_path, 3600);
    if (data) sesKart = { baslik: t.kaymaBaslik, renk: "text-sky-200", url: data.signedUrl };
  }
  if (!sesKart) {
    const { data: sonFiero } = await db
      .from("missions")
      .select("id")
      .eq("participant_id", session.sub)
      .eq("ai_score", 10)
      .gte("scored_at", new Date(istekAni - 24 * 3_600_000).toISOString())
      .limit(1)
      .maybeSingle();
    if (sonFiero) {
      const { data } = await db2.createSignedUrl(`${session.sub}/fiero.mp3`, 3600);
      if (data) sesKart = { baslik: t.fieroBaslik, renk: "text-gold-light", url: data.signedUrl };
    }
  }
  if (!sesKart && sesProfili?.night_date === bugunIst) {
    const parca = new Intl.DateTimeFormat("tr-TR", {
      timeZone: "Europe/Istanbul",
      hour: "numeric",
      minute: "numeric",
      hour12: false,
    }).formatToParts(new Date(istekAni));
    const dk =
      Number(parca.find((p) => p.type === "hour")?.value ?? 0) * 60 +
      Number(parca.find((p) => p.type === "minute")?.value ?? 0);
    if (dk >= 23 * 60 + 30) {
      const { data } = await db2.createSignedUrl(`${session.sub}/gece.mp3`, 3600);
      if (data) sesKart = { baslik: t.geceBaslik, renk: "text-indigo-300", url: data.signedUrl };
    }
  }
  if (!sesKart && sesProfili?.morning_date === bugunIst) {
    const { data } = await db2.createSignedUrl(`${session.sub}/sabah.mp3`, 3600);
    if (data) sesKart = { baslik: t.sabahBaslik, renk: "text-amber-300", url: data.signedUrl };
  }

  const ust = (
    <div>
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="prizma-serif text-[0.7rem] uppercase tracking-[0.35em] text-slate-400">
            {tr.app.name}
          </p>
          {/* İsim ASLA kesilmesin: truncate yerine sığmazsa alt satıra sarsın */}
          <h1 className="prizma-serif ay-metin mt-1 text-xl font-semibold leading-tight break-words">
            {t.hosGeldin(session.ad)}
          </h1>
        </div>
        <UstMenu
          ozTamam={ozTamam}
          dalgaAcik={!!dalga}
          raporlarAcik={raporlarAcik}
          yansimanHazir={yansimanHazir}
          ozHedefId={session.sub}
        />
      </header>
      {/* #5 "Sen neredesin" — kampın neresindeyiz şeridi */}
      <YolculukSeridi bugun={bugunIst} />
    </div>
  );

  // 1) ÖZ-PUAN KAPISI — dalga açıkken kendini puanlamadan başka hiçbir şey yok.
  // İlk kez gelen adaya birincil eyleme doğru canlı "👆 buradan başla" işareti.
  if (dalga && !ozTamam) {
    return (
      <Sayfa ust={ust} kurulum={false}>
        <BuyukKart
          baslik={t.ozGerekBaslik}
          metin={t.ozGerekMetin}
          href={`/degerlendir/${session.sub}`}
          dugme={t.ozGerekDugme}
          vurgu
        />
        <IlkAdimIpucu etiket={t.ilkAdimIpucu} />
      </Sayfa>
    );
  }

  // 2) SES RİTÜELİ — YANSIMAN doğmadıysa (öz-puandan sonra) ilk wow anı
  if (!sesProfili) {
    return (
      <Sayfa ust={ust} kurulum={false}>
        <AynaRituel />
      </Sayfa>
    );
  }

  // 2b) KAPANIŞ SÖZÜ — kamp kapanışında açıldı ve henüz söz verilmedi
  if (sozAcik && !sozVar) {
    return (
      <Sayfa ust={ust}>
        <BuyukKart
          baslik={t.sozGerekBaslik}
          metin={t.sozGerekMetin}
          href="/soz"
          dugme={t.sozGerekDugme}
          vurgu
        />
      </Sayfa>
    );
  }

  // 3) RAPOR — Gün 3 finali: aynan açıldı
  if (raporlarAcik) {
    return (
      <Sayfa ust={ust}>
        <BuyukKart
          baslik={t.raporBaslik}
          metin={t.raporMetin}
          href="/ayna"
          dugme={t.aynaniGor}
          vurgu
        />
      </Sayfa>
    );
  }

  // 4) KİŞİSEL SES — yansımandan taze bir mesaj varsa o an onundur
  if (sesKart) {
    return (
      <Sayfa ust={ust}>
        <div className="kart-cam relative overflow-hidden rounded-3xl p-6 text-center">
          <p className={`text-xl font-bold ${sesKart.renk}`}>{sesKart.baslik}</p>
          <KonusanYansima
            videoUrl={yansimaVideoUrl}
            sesUrl={sesKart.url}
            etiket={t.mesajDinle}
          />
        </div>
      </Sayfa>
    );
  }

  // 5) DEĞERLENDİRME — dalga açık ve kendini puanladın: başkalarını puanla
  if (dalga) {
    return (
      <Sayfa ust={ust}>
        <BuyukKart
          baslik={t.dalgaDevamBaslik(dalga.name)}
          metin={t.dalgaDevamMetin}
          href="/degerlendir"
          dugme={t.dalgaDevamDugme}
        />
      </Sayfa>
    );
  }

  // 6) GÖREV — açık dalga yok ama AYNA'nın görevi var
  if (gorevSayisi > 0) {
    return (
      <Sayfa ust={ust}>
        <BuyukKart
          baslik={t.gorevTekBaslik}
          metin={t.gorevTekMetin}
          href="/gorevler"
          dugme={t.gorevTekDugme(gorevSayisi)}
        />
      </Sayfa>
    );
  }

  // 7) BEKLEME — sıradaki an için sakin durum. Çıkmaz olmasın: yapacak iş
  // yokken bile sıcak bir sonraki adım (birine takdir bırakmak) sun.
  return (
    <Sayfa ust={ust}>
      <div className="kart-cam relative overflow-hidden rounded-3xl p-10 text-center">
        <p className="text-5xl">👁</p>
        <h2 className="prizma-serif ay-metin mt-4 text-2xl font-semibold">
          {t.bekleBaslik}
        </h2>
        <p className="mt-3 text-base leading-relaxed text-slate-300">{t.bekleMetin}</p>
        <div className="mt-6">
          <SicakAdim href="/takdir" etiket={t.bekleEylem} vurgu />
        </div>
      </div>
    </Sayfa>
  );
}
