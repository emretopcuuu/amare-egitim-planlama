import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { acikDalga, aktifOzellikler, ozPuanTamamMi } from "@/lib/degerlendirme";
import { raporlarGorunurMu } from "@/lib/rapor";
import { hedefKapisiAcik } from "@/lib/hedef";
import { kampOncesiAdim } from "@/lib/akis";
import { kampBaslangicGetir } from "@/lib/kampZaman";
import { sozTakipAktif, sahitSayim, secilenSahitSayisi } from "@/lib/sozTakip";
import { sozV2KapisiAcik, TANIK_HEDEF } from "@/lib/soz";
import { planOnayliMi } from "@/lib/oyunPlani";
import { tr } from "@/lib/i18n/tr";
import AynaKurulum from "@/components/AynaKurulum";
import TelefonaKurKocu from "@/components/TelefonaKurKocu";
import AynaRituel from "@/components/AynaRituel";
import HazirlikEkrani from "@/components/HazirlikEkrani";
import SesSecimiEkrani from "@/components/SesSecimiEkrani";
import EgilenKart from "@/components/EgilenKart";
import GeriSayim from "@/components/GeriSayim";
import IlkAdimIpucu from "@/components/IlkAdimIpucu";
import IlkTanitim from "@/components/IlkTanitim";
import MuhurTuru from "@/components/MuhurTuru";
import OnboardingRayi from "@/components/OnboardingRayi";
import OnboardingToren from "@/components/OnboardingToren";
import { ONBOARDING_ADIM_AD, ONBOARDING_SURE_DK } from "@/lib/onboardingSure";
import RozetSeridi from "@/components/RozetSeridi";
import BildirimAcUyari from "@/components/BildirimAcUyari";
import KampHud from "@/components/KampHud";
import GorusmeSimdi from "@/components/GorusmeSimdi";
import KonusanYansima from "@/components/KonusanYansima";
import SicakAdim from "@/components/SicakAdim";
import AlgiKoprusuKarti from "@/components/AlgiKoprusuKarti";
import { algiKoprusu } from "@/lib/algiKoprusu";
import KarsilasmaKarti from "@/components/KarsilasmaKarti";
import { karsilasmaBul } from "@/lib/karsilasma";
import UstMenu from "@/components/UstMenu";
import { SiradakiOnizleme } from "@/components/AsamaRayi";
import YeniGorevButonu from "@/components/YeniGorevButonu";
import KimlikElmasi from "@/components/elmas/KimlikElmasi";
import { kimlikElmasiVerisi } from "@/lib/elmas";
import { okunmamisMesaj } from "@/lib/icMesaj";

const t = tr.anaSayfa;

function Sayfa({
  ust,
  children,
  program,
  kurulum = true,
}: {
  ust: React.ReactNode;
  children: React.ReactNode;
  // "Günün Programın" kartı — ana kartın HEMEN ALTINDA, saatleri net gösterir.
  program?: React.ReactNode;
  kurulum?: boolean;
}) {
  // Mobil öncelikli düzen: başlık üstte, içerik onun ALTINDA üstten hizalı.
  // (Eskiden `my-auto` ile dikey ortalanıyordu; içerik ekrandan uzunsa Chrome
  // ortalayıp üstünü kırpıyor → sayfa "ortadan" açılıyordu. Artık hep en tepede.)
  return (
    <main className="flex min-h-dvh flex-col overflow-y-auto">
      <IlkTanitim />
      <div className="mx-auto w-full max-w-md shrink-0 px-5 pt-5">{ust}</div>
      <div className="mx-auto w-full max-w-md px-5 py-5">
        <div className="sahne-giris space-y-5">
          {children}
          {program}
        </div>
      </div>
      {kurulum && (
        <div className="mx-auto w-full max-w-md shrink-0 space-y-4 px-5 pb-5">
          <TelefonaKurKocu />
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
  sonraki,
}: {
  baslik: string;
  metin: string;
  href: string;
  dugme: string;
  vurgu?: boolean;
  ikon?: string;
  // Bu adımdan SONRA ne geleceğini önceden göster — "bilerek devam et".
  sonraki?: { ad: string; kilitli?: boolean; not?: string };
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
        {sonraki && (
          <SiradakiOnizleme
            ad={sonraki.ad}
            kilitli={sonraki.kilitli}
            not={sonraki.not}
            className="mt-4"
          />
        )}
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
  const [{ data: kisi }, { data: ayarlar }, { data: ofDurum }, { data: sesVarRow }, { data: pusulaErken }, { data: hedefErken }, { data: degerlerDurum }] =
    await Promise.all([
      db.from("participants").select("camp_unlocked_at, team, consent_at, ayna_ses_secildi_at, onboarding_toren_at").eq("id", session.sub).maybeSingle(),
      db
        .from("settings")
        .select("key, value")
        .in("key", ["gunun_cumlesi"]),
      db.from("on_farkindalik").select("tamamlandi_at").eq("participant_id", session.sub).maybeSingle(),
      // Ses/foto ritüeli kapısı için erken kontrol — akışın EN BAŞINA gelir.
      db.from("voice_profiles").select("participant_id").eq("participant_id", session.sub).maybeSingle(),
      db.from("pusula").select("tamamlandi_at, slogan").eq("participant_id", session.sub).maybeSingle(),
      // Hedef kapısı (kamp öncesi 3b): Pusula biter bitmez devreye girer.
      db.from("hedef").select("tamamlandi_at").eq("participant_id", session.sub).maybeSingle(),
      // Değerler çalışması (2b): Pusula'dan hemen önce + ana sayfa kimlik çapası.
      db.from("degerler_calismasi").select("tamamlandi_at, secilen_uc, neden_cumlesi").eq("participant_id", session.sub).maybeSingle(),
    ]);
  const ayar = new Map((ayarlar ?? []).map((a) => [a.key, a.value]));
  const gununCumlesi = (ayar.get("gunun_cumlesi") ?? "").trim();

  // Güvenlik: katılımcı DB'de silinmiş ama JWT hâlâ geçerli → sonsuz döngü yaşanır.
  // Çerez temizle ve yeniden giriş yaptır.
  if (!kisi) redirect("/api/cikis");

  // KİMLİK ELMASI verisi (yalnız kamp içindeyken) — ana sayfanın kalbindeki
  // canlı 3B elmasını besler: her tamamlanan görev bir faseti ışıtır.
  const elmasVeri = kisi.camp_unlocked_at ? await kimlikElmasiVerisi(db, session.sub) : null;

  // Menü rozetleri: okunmamış iç mesaj sayısı + analiz sayısı ("yeni" noktası).
  const [okunmamisMesajSayisi, analizSayisi] = await Promise.all([
    okunmamisMesaj(db, session.sub),
    db
      .from("ayna_analiz")
      .select("id", { count: "exact", head: true })
      .eq("participant_id", session.sub)
      .then((r) => r.count ?? 0),
  ]);

  // SIRA (kamp öncesi onboarding) — tek doğruluk kaynağı: lib/akis.ts.
  // 1) SES RİTÜELİ → 2) OYUN SEÇİMİ → 3) PUSULA → 3b) HEDEF → 4) ÖN FARKINDALIK
  // → 5) MÜHÜR KAPISI → 6) KAMP İÇİ HEDEF. Sıralama orada kilitli; burada uygulanır.

  // Kamp içi hedef kapısı yalnız fiziksel giriş yapılmışsa sorgulanır (gereksiz
  // DB çağrısı yok); pusula penceresi açık olmayan kişide de hedef erişilebilir kalsın.
  const kampIciHedefKapisi = kisi?.camp_unlocked_at
    ? await hedefKapisiAcik(db, session.sub)
    : false;
  const adim = kampOncesiAdim({
    rizaVar: !!kisi?.consent_at,
    sesSecildi: !!kisi?.ayna_ses_secildi_at,
    sesVar: !!sesVarRow,
    team: kisi?.team ?? null,
    campUnlocked: !!kisi?.camp_unlocked_at,
    degerlerTamam: !!degerlerDurum?.tamamlandi_at,
    pusulaTamam: !!pusulaErken?.tamamlandi_at,
    hedefTamam: !!hedefErken?.tamamlandi_at,
    ofTamam: !!ofDurum?.tamamlandi_at,
    oyunSecimiAcik: true,
    degerlerAcik: true,
    pusulaAcik: true,
    onFarkindalikAcik: true,
    kampIciHedefKapisi,
  });
  // [E10] BİTİŞ TÖRENİ — onboarding checklist'inin tamamı (ritüel + oyun +
  // değerler + pusula + hedef + ön farkındalık) İLK KEZ yeşile döndüğünde tam
  // ekran "Aynan kuruldu" töreni. Tek seferlik: damga render sırasında atılır
  // (POST'a gerek yok; POST düşerse kişi törende sıkışırdı). Mevcut kamptaki
  // herkes migration 0117'de geriye dönük damgalandı — tören yalnız bundan
  // sonra tamamlayanlar (ör. geç katılan) için bir kez çalışır.
  const onboardingTamam =
    !!kisi.consent_at &&
    !!kisi.ayna_ses_secildi_at &&
    !!sesVarRow &&
    !!kisi.team &&
    !!degerlerDurum?.tamamlandi_at &&
    !!pusulaErken?.tamamlandi_at &&
    !!hedefErken?.tamamlandi_at &&
    !!ofDurum?.tamamlandi_at;
  if (onboardingTamam && !kisi.onboarding_toren_at) {
    await db
      .from("participants")
      .update({ onboarding_toren_at: new Date().toISOString() })
      .eq("id", session.sub)
      .is("onboarding_toren_at", null);
    return <OnboardingToren slogan={pusulaErken?.slogan ?? null} />;
  }

  if (adim.tip === "hazirlik") {
    // KUTSAL ALAN / HAZIRLIK — onboarding'in en başı. Tonu kurar (yalnız,
    // sakin, ~1 saat, kendine dönüş) + KVKK rızasını kayıtla alır. Rıza
    // verilene dek veri toplayan hiçbir adım açılmaz.
    return <HazirlikEkrani ad={session.ad} />;
  }
  if (adim.tip === "sesSecimi") {
    // AYNA SESİ SEÇİMİ — hazırlıktan hemen sonra, ritüelden önce. Bu andan
    // itibaren AYNA'nın kişisel seslendirmeleri seçilen sesle konuşur.
    return <SesSecimiEkrani />;
  }
  if (adim.tip === "rituel") {
    // FOTO + SES RİTÜELİ — Yansıman'ın doğuşu. Tamamlanana (ya da "sessiz"
    // seçilene) dek grup ve sorular dahil başka hiçbir kapı açılmaz.
    return <AynaRituel />;
  }
  if (adim.tip === "yonlendir") {
    // ?intro=1 (tanıtım testi) yalnız ilk Pusula kapısında (neden keşfi henüz
    // bitmemişken) anlamlı — yönlendirmede kaybolmasın diye taşı.
    if (adim.yol === "/pusula" && !pusulaErken?.tamamlandi_at) {
      const intro = (await searchParams).intro !== undefined;
      if (intro) redirect("/pusula?intro=1");
    }
    // [E1] "KALDIĞIN YERDEN DEVAM" KARTI — hedef adım daha önce BAŞLAMIŞ ama
    // bitmemişse (satırı var, tamamlanmamış) sessiz yönlendirme yerine tek
    // dokunuşluk büyük kart göster: dönen kişi nereye ışınlandığını anlar.
    // Adım hiç başlamamışsa mevcut akış aynen yönlendirir (akış içi zincir
    // bozulmaz); mühür kapısı (/pusula, tamamlanmış) ve oyun seçimi (kısmi
    // durumu olmayan tek dokunuş) karta girmez.
    const yarimAdim =
      adim.yol === "/degerler" && degerlerDurum && !degerlerDurum.tamamlandi_at
        ? ("degerler" as const)
        : adim.yol === "/pusula" && pusulaErken && !pusulaErken.tamamlandi_at
          ? ("pusula" as const)
          : adim.yol === "/hedef" && hedefErken && !hedefErken.tamamlandi_at
            ? ("hedef" as const)
            : adim.yol === "/on-farkindalik" && ofDurum && !ofDurum.tamamlandi_at
              ? ("onFarkindalik" as const)
              : null;
    if (yarimAdim) {
      return (
        // Tam ekran odak (öz-puan kapısı deseni): kamp içeriği sızmaz, tek iş.
        <main className="gece-ada fixed inset-0 z-50 flex flex-col overflow-y-auto bg-[#04101c] p-6">
          <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
            {/* Mevcut harita/checklist kalır — kart onun altında tek eylem */}
            <div className="mb-3">
              <OnboardingRayi />
            </div>
            <BuyukKart
              baslik={t.devamKartBaslik(ONBOARDING_ADIM_AD[yarimAdim])}
              metin={t.devamKartMetin}
              href={adim.yol}
              dugme={t.devamKartDugme(ONBOARDING_SURE_DK[yarimAdim])}
              ikon="⏸"
              vurgu
            />
          </div>
        </main>
      );
    }
    redirect(adim.yol);
  }

  const [
    dalga,
    raporlarAcik,
    ozellikler,
    { count: aktifGorev },
    { data: sesProfili },
    { data: kayma },
    { data: dalgaZamanAyar },
    { data: boslukAyar },
    { data: pusulaKisi },
    { data: boslukKisi },
    { data: siradakiGorevSatir },
    { data: momentumSatirlar },
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
      db.from("settings").select("value").eq("key", "sonraki_dalga_zamani").maybeSingle(),
      // FAZ 1 Boşluk Anı (Gün 3 zirvesi) — yalnız pencere açıkken devreye girer
      db.from("settings").select("value").eq("key", "bosluk_acik").maybeSingle(),
      db.from("pusula").select("tamamlandi_at, slogan").eq("participant_id", session.sub).maybeSingle(),
      db.from("bosluk_ani").select("yeni_cumle").eq("participant_id", session.sub).maybeSingle(),
      // Ana sayfada "sıradaki görev"i adıyla gösterebilmek için en yakın bekleyen görev.
      db
        .from("missions")
        .select("title")
        .eq("participant_id", session.sub)
        .eq("status", "pending")
        .order("due_at", { ascending: true })
        .limit(1)
        .maybeSingle(),
      // #5 Momentum göstergesi: son 2 haftanın skoru (mevcut + trend).
      db
        .from("momentum_scores")
        .select("score, week_start")
        .eq("participant_id", session.sub)
        .order("week_start", { ascending: false })
        .limit(2),
    ]);
  // FAZ B: söz mühürlüyse (sesli) ana ekran 90-gün yolculuğuna geçer; ayrıca
  // kişi başkalarına şahitse şahit paneline erişir.
  const [takipAktif, sahitSayisi, sozV2Acik, planOnayli, secilenSahit] = await Promise.all([
    sozTakipAktif(db, session.sub),
    sahitSayim(db, session.sub),
    // FAZ 1 (tek söz): kapanış artık SÖZ v2 (plandan doğan söz) üstünden yürür.
    sozV2KapisiAcik(db),
    planOnayliMi(db, session.sub),
    secilenSahitSayisi(db, session.sub),
  ]);
  // Şahit adımı ZORUNLU: söz mühürlü ama 5 şahit seçilmemişse 90 gün yolculuğu
  // açılmaz; kişi şahit seçimine geri gönderilir (/sozum tanik fazına düşer).
  const sahitEksik = takipAktif && secilenSahit < TANIK_HEDEF;
  const takim = kisi?.team ?? null;

  // Ayna Eşin görüşmeleri (canlı "şimdi görüşmen" şeridi için) — yalnız açıkken.
  let gorusmeListe: { slot: string; esAd: string; benimTamam: boolean }[] = [];
  {
    const { data: aeAyar } = await db
      .from("settings")
      .select("value")
      .eq("key", "ayna_esi_acik")
      .maybeSingle();
    if (aeAyar?.value === "true") {
      const { data: aeSatir } = await db
        .from("ayna_esi")
        .select(
          "slot, a_id, b_id, a_tamam, b_tamam, a:participants!ayna_esi_a_id_fkey(full_name), b:participants!ayna_esi_b_id_fkey(full_name)"
        )
        .or(`a_id.eq.${session.sub},b_id.eq.${session.sub}`)
        .order("tur");
      gorusmeListe = (aeSatir ?? []).map((s) => {
        const benA = s.a_id === session.sub;
        const a = s.a as unknown as { full_name: string } | null;
        const b = s.b as unknown as { full_name: string } | null;
        return {
          slot: s.slot as string,
          esAd: (benA ? b?.full_name : a?.full_name)?.split(" ")[0] ?? "—",
          benimTamam: benA ? !!s.a_tamam : !!s.b_tamam,
        };
      });
    }
  }

  // [FAZ 9 · U2] Yetim yolculuk sayfalarına menüden erişim — İkinci Ayna ve
  // Mühür Zinciri eskiden yalnız push ile açılıyordu (push kaçarsa ulaşılamazdı).
  const { data: menuAyarlar } = await db
    .from("settings")
    .select("key, value")
    .in("key", ["ikinci_ayna_acik", "muhur_plus30_acik", "muhur_plus60_acik", "muhur_plus90_acik"]);
  const menuAyar = new Map((menuAyarlar ?? []).map((a) => [a.key, a.value]));
  const ikinciAynaAcik = menuAyar.get("ikinci_ayna_acik") === "true";
  const muhurZinciriAcik =
    menuAyar.get("muhur_plus30_acik") === "true" ||
    menuAyar.get("muhur_plus60_acik") === "true" ||
    menuAyar.get("muhur_plus90_acik") === "true";

  const momentumSkor =
    typeof momentumSatirlar?.[0]?.score === "number" ? momentumSatirlar[0].score : null;
  const momentumOnceki =
    typeof momentumSatirlar?.[1]?.score === "number" ? momentumSatirlar[1].score : null;
  const siradakiGorevBasligi =
    typeof siradakiGorevSatir?.title === "string" ? siradakiGorevSatir.title : null;
  // B3: kişinin Pusula sloganı — hub'da kimlik çapası.
  const kisiSlogan = (pusulaKisi as { slogan?: string | null } | null)?.slogan ?? null;
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
  // Kamp başlangıcı: KampHud kendi gün hesabını buradan türetir.
  const kampBaslangic = await kampBaslangicGetir(db);
  // eslint-disable-next-line react-hooks/purity
  const istekAni = Date.now();

  // B5: "bugün ne oldu" — bekleme/sakin anlarda hub'ı canlı tutar.
  const bugunBasISO = new Date(`${bugunIst}T00:00:00+03:00`).toISOString();
  const [{ count: bugunTakdir }, { count: bugunGorevSayi }] = await Promise.all([
    db
      .from("kudos")
      .select("id", { count: "exact", head: true })
      .eq("to_id", session.sub)
      .eq("is_hidden", false)
      .gte("created_at", bugunBasISO),
    db
      .from("missions")
      .select("id", { count: "exact", head: true })
      .eq("participant_id", session.sub)
      .eq("status", "scored")
      .gte("scored_at", bugunBasISO),
  ]);
  const bugunOzetVar = (bugunTakdir ?? 0) > 0 || (bugunGorevSayi ?? 0) > 0;

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
      {/* B9: mühür açıldıysa tek seferlik kısa tur (kendi içinde localStorage ile gated) */}
      {kisi?.camp_unlocked_at && <MuhurTuru />}
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
          ad={session.ad}
          unvanAd={elmasVeri?.unvanAd ?? null}
          kivilcim={elmasVeri?.kivilcim ?? 0}
          okunmamisMesaj={okunmamisMesajSayisi}
          analizSayisi={analizSayisi}
          pusulaTamam={!!pusulaErken?.tamamlandi_at}
          hedefTamam={!!hedefErken?.tamamlandi_at}
          ofTamam={!!ofDurum?.tamamlandi_at}
          ikinciAynaAcik={ikinciAynaAcik}
          muhurZinciriAcik={muhurZinciriAcik}
        />
      </header>
      {/* [KURULUM] Kurulu ama bildirim kapalı → tepede büyük "Bildirimleri Aç"
          kartı. Kampın kalbi push; bu kişiyi altta küçük kartla değil burada
          yakalarız. Abone olunca / desteklenmeyen ortamda kendini gizler. */}
      <div className="mt-3">
        <BildirimAcUyari />
      </div>
      {/* B3: Pusula sloganı — her gün görünür kimlik çapası */}
      {kisiSlogan && (
        <p className="prizma-serif ay-metin mt-2 text-sm font-medium italic leading-snug text-gold-light/90">
          &ldquo;{kisiSlogan}&rdquo;
        </p>
      )}
      {/* DEĞERLER ÇAPASI — değerler çalışmasından çıkan 3 temel değer + neden cümlesi */}
      {degerlerDurum?.secilen_uc && degerlerDurum.secilen_uc.length === 3 && (
        <div className="mt-3 rounded-2xl border border-gold/20 bg-white/[0.02] p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[0.7rem] font-semibold uppercase tracking-wide text-slate-400">
              Temel değerlerim
            </span>
            {degerlerDurum.secilen_uc.map((d) => (
              <span key={d} className="rounded-full bg-gold/15 px-2.5 py-0.5 text-sm font-semibold text-gold-light">
                {d}
              </span>
            ))}
          </div>
          {degerlerDurum.neden_cumlesi && (
            <p className="prizma-serif ay-metin mt-2 text-sm italic leading-snug text-gold-light/90">
              {degerlerDurum.neden_cumlesi}
            </p>
          )}
        </div>
      )}
      {/* KİMLİK ELMASI — kampın kalbi: her görevle parlayan canlı 3B artefakt */}
      {elmasVeri && (
        <div className="mt-3">
          <KimlikElmasi
            tamamlanan={elmasVeri.tamamlanan}
            parlaklik={elmasVeri.parlaklik}
            ortalamaPuan={elmasVeri.ortalamaPuan}
            facetler={elmasVeri.facetler}
            sonFacet={elmasVeri.sonFacet}
            asama={elmasVeri.asama}
          />
        </div>
      )}
      {/* [KURULUM 7/8] Rozetler (İlk Işık/El Ele) + "yanındakiyle el ele" girişi */}
      <RozetSeridi />
      {/* S1: YolculukSeridi kaldırıldı; gün etiketi haritanın içine taşındı.
          UX: Faz merdiveni HAZIRLIK göstergesidir — kamp açıldıktan sonra
          (kişi içerideyken) görev + programın önüne geçen ikincil gürültüdür.
          Bu yüzden YALNIZ kamp öncesinde gösterilir; kamp boyunca gizlenir. */}
      {!kisi?.camp_unlocked_at && (
        <div className="mt-2">
          {/* ONBOARDING RAYI — tüm 6 faz + Kamp tek bakışta; bitirdiğin faza
              tıklayıp geri dönebilirsin, henüz açmadığına atlayamazsın. */}
          <OnboardingRayi />
        </div>
      )}
      {/* S8: KampHud + GorusmeSimdi tek "şu an" bloğu */}
      <div className="space-y-1.5">
        <KampHud takim={takim} baslangic={kampBaslangic} />
        <GorusmeSimdi gorusmeler={gorusmeListe} />
      </div>
      {/* S2: Pano sadeleşti — sadece Günün Cümlesi (admin seçimi) inline kalır */}
      {gununCumlesi && (
        <div className="mt-3 rounded-xl border border-gold/25 bg-gold/[0.06] px-4 py-2.5">
          <p className="text-sm italic leading-relaxed text-slate-200">
            <span className="mr-1">🗣</span>
            {gununCumlesi}
          </p>
        </div>
      )}
    </div>
  );

  // (SES/FOTO RİTÜELİ kapısı akışın en başına alındı — bkz. yukarıdaki erken
  // kontrol. Buraya gelindiğinde ses profili kesinlikle vardır.)

  // ÖZ-PUAN KAPISI — kendini puanlamadan başkasını puanlayamazsın.
  // Tam ekran odak (üst menü + alt çubuk gizli): tek iş, dolaşma yok.
  if (dalga && !ozTamam) {
    return (
      <main className="gece-ada fixed inset-0 z-50 flex flex-col overflow-y-auto bg-[#04101c] p-6">
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
          <BuyukKart
            baslik={t.ozGerekBaslik}
            metin={t.ozGerekMetin}
            href={`/degerlendir/${session.sub}`}
            dugme={t.ozGerekDugme}
            ikon="✨"
            vurgu
            sonraki={{ ad: t.ozSonraki }}
          />
          <IlkAdimIpucu etiket={t.ilkAdimIpucu} />
        </div>
      </main>
    );
  }

  // 2b) KAPANIŞ AKIŞI (FAZ 1 — tek söz) — kapanış tetiklenince (soz_v2_acik) ve
  // söz henüz mühürlenmemişken: önce "90 Günlük Oyun Planını Kur" (kişi kendi
  // kararıyla plan yapar), plan onaylanınca "Sözünü Ver". Söz mühürlenince aşağıda
  // 2d takip akışı devralır. Rapor okunmadan (reports_visible) buraya gelinmez.
  if (sozV2Acik && !takipAktif) {
    if (!planOnayli) {
      return (
        <Sayfa ust={ust}>
          <BuyukKart
            baslik="90 Günlük Oyun Planını Kur"
            metin="Raporunu okudun. Şimdi kamptan sonrası için planını birlikte kuralım — kararlar senin, ben danışmanın."
            href="/oyun-planim"
            dugme="Planımı Kur"
            ikon="🧭"
            vurgu
            sonraki={{ ad: "Sözünü Ver", kilitli: true, not: "planını onaylayınca açılır" }}
          />
        </Sayfa>
      );
    }
    return (
      <Sayfa ust={ust}>
        <BuyukKart
          baslik="Sözünü Ver"
          metin="Planın hazır. Şimdi onu kendi sözüne dönüştür — sesinle mühürle."
          href="/sozum"
          dugme="Sözünü Ver"
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
          ikon="👁"
          vurgu
        />
      </Sayfa>
    );
  }

  // 2c-b) ŞAHİT KAPISI (ZORUNLU) — söz mühürlü ama 5 şahit seçilmemişse 90 gün
  // yolculuğu yerine önce şahit seçtirilir. /sozum durum 'sesli' + eksik şahitte
  // doğrudan tanik (şahit seçimi) fazını açar.
  if (sahitEksik) {
    return (
      <Sayfa ust={ust}>
        <BuyukKart
          baslik="Şahitlerini Seç"
          metin="Sözünü verdin. 90 güne başlamadan önce 5 lider şahit seç — onlar sözünü görecek, imzalayacak ve yolda seni takip edip gerektiğinde dürtecek. Bu adım zorunlu."
          href="/sozum"
          dugme={`Şahit Seç (${secilenSahit}/${TANIK_HEDEF})`}
          ikon="🤝"
          vurgu
        />
      </Sayfa>
    );
  }

  // 2d) 90 GÜN YOLCULUĞU — söz mühürlüyse (sesli) ana ekran takibe geçer.
  // Rapor hâlâ üst menüden + buradaki linkten erişilir.
  if (takipAktif) {
    return (
      <Sayfa ust={ust}>
        <BuyukKart
          baslik={t.takipBaslik}
          metin={t.takipMetin}
          href="/takip"
          dugme={t.takipDugme}
          ikon="🧭"
          vurgu
        />
        <div className="mt-4 space-y-3">
          {/* Kişinin KENDİ sözü + seçtiği şahitler (imza durumu, QR ile toplama,
              düzenleme) — yolculuğa geçtikten sonra da erişilebilir olmalı. */}
          <SicakAdim href="/sozum" etiket="🤝 Sözün ve şahitlerin" />
          {sahitSayisi > 0 && (
            <SicakAdim href="/sahitlik" etiket={t.takipSahitlik(sahitSayisi)} vurgu />
          )}
          <SicakAdim href="/ayna" etiket={t.takipAyna} />
        </div>
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
          ikon="👁"
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
          sonraki={{ ad: t.dalgaSonraki }}
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
          metin={siradakiGorevBasligi ? `"${siradakiGorevBasligi}"` : t.gorevTekMetin}
          href="/gorevler"
          dugme={t.gorevTekDugme(gorevSayisi)}
          ikon="🤖"
        />
      </Sayfa>
    );
  }

  // 7) BEKLEME — görev/dalga yokken BOŞLUK GÖSTERME: program birincil olur.
  // "Şimdi ne yapacağım?" sorusu hep programla yanıtlanır; sakin durum + sıcak
  // adım ikincil, küçük bir kartta akar (görev + program her zaman önde).
  //
  // #3 Algı Köprüsü (finali koruyan canlı deney): yalnız kamp açıkken ve raporlar
  // HENÜZ kapalıyken (Gün 3 öncesi/finalden önce) gösterilir; içerik açmaz.
  const [koprusu, karsilasma] =
    kisi?.camp_unlocked_at && !raporlarAcik
      ? await Promise.all([
          algiKoprusu(db, session.sub),
          karsilasmaBul(db, session.sub),
        ])
      : [null, null];
  // D7 — karşılaşma partnerinin kişi kartı verisi: foto (imzalı URL) + takım +
  // telefon. Telefon YALNIZ bu tek eşleşme hedefi için sunucudan iner — genel
  // roster istemciye sızmaz.
  let karsilasmaPartner: {
    ad: string;
    takim: string | null;
    telefon: string | null;
    fotoUrl: string | null;
  } | null = null;
  if (karsilasma) {
    const { data: partnerKisi } = await db
      .from("participants")
      .select("full_name, team, phone, profil_foto_path")
      .eq("id", karsilasma.partnerId)
      .maybeSingle();
    let fotoUrl: string | null = null;
    if (partnerKisi?.profil_foto_path) {
      const { data: imzali } = await db.storage
        .from("sesler")
        .createSignedUrl(partnerKisi.profil_foto_path, 3600);
      fotoUrl = imzali?.signedUrl ?? null;
    }
    karsilasmaPartner = {
      ad: partnerKisi?.full_name ?? karsilasma.partnerAd,
      takim: partnerKisi?.team ?? null,
      telefon: partnerKisi?.phone ?? null,
      fotoUrl,
    };
  }
  return (
    <Sayfa ust={ust}>
      {/* Program artık alt menüdeki "Program" sekmesinde (kişisel, katlanır).
          Ana ekran sadeleşti — burada tekrar gösterilmiyor. */}

      {/* AYNA'nın deneyi — ikincil, merak uyandıran (kör nokta içeriği YOK) */}
      {koprusu && <AlgiKoprusuKarti veri={koprusu} />}

      {/* Karşılaşma — AYNA'nın eşlediği tamamlayıcı kişiyle konuşma daveti */}
      {karsilasma && (
        <KarsilasmaKarti partnerAd={karsilasma.partnerAd} partner={karsilasmaPartner} />
      )}

      {/* İkincil sakin durum — küçük, programın altında akar */}
      <div className="kart-cam relative overflow-hidden rounded-2xl p-5 text-center">
        <h2 className="prizma-serif ay-metin text-lg font-semibold">{t.bekleBaslik}</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{t.bekleMetin}</p>
        {/* B5: bugün ne oldu — sakin anda hub'ı canlı tutar */}
        {bugunOzetVar && (
          <p className="mt-2.5 rounded-xl bg-white/[0.03] px-4 py-2 text-sm text-slate-300">
            {t.bugunNeOldu(bugunGorevSayi ?? 0, bugunTakdir ?? 0)}
          </p>
        )}
        {/* #4 Sıradaki dalgaya geri sayım: yalnızca zamanlama ayarlıysa */}
        {sonrakiDalgaZamani && <GeriSayim hedefZaman={sonrakiDalgaZamani} />}
        <div className="mt-4 space-y-3">
          {/* Beklemeden, kişi AYNA'dan o an taze bir görev çekebilir. */}
          <YeniGorevButonu vurgu />
          {/* S10: dalga kapalıyken Koç zaten alt çubukta — burada tek öneri yeterli */}
          <SicakAdim href="/kocu" etiket={t.bekleKocu} />
          {(bugunTakdir ?? 0) > 0 && (
            <SicakAdim href="/takdir" etiket={t.bekleEylem} />
          )}
        </div>
      </div>
    </Sayfa>
  );
}
