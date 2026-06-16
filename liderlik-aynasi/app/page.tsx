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
import GeriSayim from "@/components/GeriSayim";
import IlkAdimIpucu from "@/components/IlkAdimIpucu";
import IlkTanitim from "@/components/IlkTanitim";
import YolculukSeridi from "@/components/YolculukSeridi";
import KonusanYansima from "@/components/KonusanYansima";
import SicakAdim from "@/components/SicakAdim";
import UstMenu from "@/components/UstMenu";
import ToplulukNabzi from "@/components/ToplulukNabzi";

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
  ikon,
}: {
  baslik: string;
  metin: string;
  href: string;
  dugme: string;
  vurgu?: boolean;
  ikon?: string;
}) {
  return (
    <EgilenKart className="rounded-3xl">
      <div className="kart-cam relative overflow-hidden rounded-3xl p-8 text-center">
        {ikon && (
          <p className="mb-4 text-5xl leading-none" aria-hidden>
            {ikon}
          </p>
        )}
        <h2 className="prizma-serif ay-metin text-3xl font-semibold leading-tight">
          {baslik}
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-slate-300">{metin}</p>
        <Link
          href={href}
          className={`mt-8 flex h-16 w-full items-center justify-center gap-2 rounded-2xl text-xl font-bold transition-transform hover:scale-[1.01] ${
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
export default async function AnaSayfa({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await getSession();
  if (!session) redirect("/giris");
  // Admin/yardımcı katılımcı akışına girmesin: aksi halde Pusula kapısı ile
  // /pusula arasında sonsuz yönlendirme döngüsü oluşuyordu (camp_unlocked boş).
  if (session.rol !== "participant") redirect("/admin");

  const db = supabaseAdmin();

  // FAZ 0 kapısı (HARMAN): Pusula penceresi açıkken, kampa fiziksel giriş
  // yapmamış katılımcı kamp öncesi yolculuğu yapar. Sıra: önce ÖN FARKINDALIK
  // (ayna katmanları — bayrak açıksa ve bitmediyse), sonra PUSULA (derin neden +
  // iç engel). Bayraklar kapalıyken mevcut davranış birebir korunur.
  const [{ data: kisi }, { data: ayarlar }, { data: ofDurum }] = await Promise.all([
    db.from("participants").select("camp_unlocked_at").eq("id", session.sub).maybeSingle(),
    db.from("settings").select("key, value").in("key", ["pusula_acik", "on_farkindalik_acik"]),
    db.from("on_farkindalik").select("tamamlandi_at").eq("participant_id", session.sub).maybeSingle(),
  ]);
  const ayar = new Map((ayarlar ?? []).map((a) => [a.key, a.value]));
  if (ayar.get("pusula_acik") === "true" && !kisi?.camp_unlocked_at) {
    if (ayar.get("on_farkindalik_acik") === "true" && !ofDurum?.tamamlandi_at) {
      redirect("/on-farkindalik");
    }
    // ?intro=1 (tanıtım testi) yönlendirmede kaybolmasın diye taşı.
    const intro = (await searchParams).intro !== undefined;
    redirect(intro ? "/pusula?intro=1" : "/pusula");
  }

  const [
    dalga,
    raporlarAcik,
    ozellikler,
    { count: aktifGorev },
    { data: sesProfili },
    { data: kayma },
    { data: sozAyar },
    { data: soz },
    { data: dalgaZamanAyar },
    { data: boslukAyar },
    { data: pusulaKisi },
    { data: boslukKisi },
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
      db.from("settings").select("value").eq("key", "sonraki_dalga_zamani").maybeSingle(),
      // FAZ 1 Boşluk Anı (Gün 3 zirvesi) — yalnız pencere açıkken devreye girer
      db.from("settings").select("value").eq("key", "bosluk_acik").maybeSingle(),
      db.from("pusula").select("tamamlandi_at").eq("participant_id", session.sub).maybeSingle(),
      db.from("bosluk_ani").select("yeni_cumle").eq("participant_id", session.sub).maybeSingle(),
    ]);
  const sozAcik = sozAyar?.value === "true";
  const sozVar = !!soz;
  // FAZ 1: pusulasını kuran kişi, pencere açıkken iç engeliyle yüzleşir.
  const boslukGoster =
    boslukAyar?.value === "true" &&
    !!pusulaKisi?.tamamlandi_at &&
    !boslukKisi?.yeni_cumle;
  // #4 Sıradaki dalgaya geri sayım: yalnızca dalga kapalıyken ve zaman ayarlıysa göster
  const sonrakiDalgaZamani = !dalga && dalgaZamanAyar?.value ? dalgaZamanAyar.value : null;

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
      {/* Topluluk nabzı — yalnız değilsin hissi */}
      <ToplulukNabzi />
    </div>
  );

  // 1) SES RİTÜELİ — kampa girişten sonraki İLK adım: Yansıman'ın doğuşu.
  // Tam ekran, kademeli; tamamlanmadan (ya da "sessiz" seçilmeden) başka
  // hiçbir şey görünmez — kişi dolaşamaz, doğrudan ritüel akışına girer.
  if (!sesProfili) {
    return (
      <Sayfa ust={ust} kurulum={false}>
        <AynaRituel />
      </Sayfa>
    );
  }

  // 2) ÖZ-PUAN KAPISI — kendini puanlamadan başkasını puanlayamazsın.
  // Tam ekran odak (üst menü + alt çubuk gizli): tek iş, dolaşma yok.
  if (dalga && !ozTamam) {
    return (
      <main className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-[#04101c] p-6">
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
          <BuyukKart
            baslik={t.ozGerekBaslik}
            metin={t.ozGerekMetin}
            href={`/degerlendir/${session.sub}`}
            dugme={t.ozGerekDugme}
            ikon="✨"
            vurgu
          />
          <IlkAdimIpucu etiket={t.ilkAdimIpucu} />
        </div>
      </main>
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
          ikon="🤝"
          vurgu
        />
      </Sayfa>
    );
  }

  // 2c) BOŞLUK ANI — Gün 3 zirvesi: iç engeli kamptaki kanıtla çürütme.
  // Pusulasını kuran kişiyi, pencere açıkken rapordan ÖNCE yüzleşmeye davet eder.
  if (boslukGoster) {
    return (
      <Sayfa ust={ust}>
        <BuyukKart
          baslik={t.boslukBaslik}
          metin={t.boslukMetin}
          href="/bosluk"
          dugme={t.boslukDugme}
          ikon="🪞"
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
          ikon="🪞"
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
          ikon="👁"
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
          ikon="🤖"
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
        {/* #4 Sıradaki dalgaya geri sayım: yalnızca zamanlama ayarlıysa */}
        {sonrakiDalgaZamani && <GeriSayim hedefZaman={sonrakiDalgaZamani} />}
        <div className="mt-6 space-y-3">
          <SicakAdim href="/takdir" etiket={t.bekleEylem} vurgu />
          {/* FAZ 3 Go-for-No: boş anda reddi veriye çevir */}
          <SicakAdim href="/red" etiket={t.bekleRed} />
        </div>
      </div>
    </Sayfa>
  );
}
