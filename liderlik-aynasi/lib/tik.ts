import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import { eskalasyonTara } from "@/lib/sozTakip";
import {
  gorevUret,
  gorevPuanla,
  senkronGorevUret,
  mentorlukGorevUret,
  gorevAraligiDk,
  istanbulSaati,
  sessizSaatMi,
  aynaAniUret,
} from "@/lib/ayna";
import { aynaAniAdaylari } from "@/lib/aynaAniTetik";
import { kampAnaliziTik, type AsamaKod } from "@/lib/aynaAnaliz";
import { grupOdevUret } from "@/lib/grupOdev";
import { kivilcimHesapla } from "@/lib/kivilcim";
import {
  kaymaKarari,
  senkronAnahtari,
  senkronYedekSec,
  yolculukGunuHesapla,
  pikSaatBul,
  saatFarki,
  type SistemModu,
} from "@/lib/davranis";
import { momentumHesaplaVeYaz } from "@/lib/momentum";
import { aktifOzellikler } from "@/lib/degerlendirme";
import { GARANTILI_GOREVLER, siradakiGarantiliGorev } from "@/lib/garantiliGorevler";
import {
  kampGunu,
  suankiMadde,
  bitenMadde,
  siradakiMadde,
  yaklasanEtkinlik,
  dakikaCevir,
  sahneSessizMi,
  sabahPenceresiMi,
  GECE_FISILTILARI,
  geceYansimaMetni,
} from "@/lib/kampProgrami";
import {
  gorevSeslendir,
  itirazSesi,
  kaymaSesi,
  sabahSesi,
  fieroSesi,
  geceSesi,
  markaAnons,
} from "@/lib/yansima";
import { kampKayipWhatsApp } from "@/lib/kayipRadar";
import { nabizVur, nabizBekcisi, NABIZ_TIK, NABIZ_OLAYLAR } from "@/lib/nabiz";
import {
  grupNoCozumle,
  cumartesiGrupEtkinligi,
  cumartesiGrupBitenEtkinlik,
  cumartesiGrupSiradakiEtkinlik,
  grupAktifBlok,
  grupBitenBlok,
  grupAzOnceFiziksel,
  grupBostaMi,
} from "@/lib/cumartesiProgrami";
import { eslesmeHedefiSec, eslesmeKaydet, type EslesmeAday } from "@/lib/gorevEslesme";
import { orkestratoduIsle } from "@/lib/orkestrator";
import { johariCaprazGorevUret } from "@/lib/johariCapraz";
import { gizliEsGorevMetni, tanikGoreviMetni, miniKonseyMetinleri } from "@/lib/eslesmeWow";
import { zincirBaslat } from "@/lib/kampZinciri";
import { tahminSapmasiGorevUret } from "@/lib/tahminSapmasi";
import { karsilasmaBul } from "@/lib/karsilasma";
import { higgsYapilandirildiMi, yansimaDurumu } from "@/lib/higgs";
import { katilimciyaBildir, herkeseBildir } from "@/lib/push";
import { whatsAppGonder, sablonSidGetir, whatsAppYapilandirildiMi } from "@/lib/whatsapp";
import { sablonBul, ilkAd } from "@/lib/whatsappSablonlari";
import { gunlukSoz } from "@/lib/ozluSozler";
import { kanitGarantisiDagit } from "@/lib/kanitGarantisi";
import { tr } from "@/lib/i18n/tr";

type Db = ReturnType<typeof supabaseAdmin>;

function istanbulTarihi(an: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(an);
}

// AYNA'nın kalp atışı — TEK gerçek kaynak burada. Üretimde Supabase pg_cron
// `/api/tik` üzerinden GERÇEK zamanla (simdi = new Date()) çağırır. Admin
// "prova" yolu aynı fonksiyonu SEÇİLEN bir saatle çağırır (testModu=true):
// böylece görev/ses üretimi prova edilir ama canlı kamp asla etkilenmez.
//
// testModu: sessiz saat ve sahne sessizliğini yok sayar (gece/sahne sırasında
// bile prova yapılabilsin).
export async function tikCalistir(
  db: Db,
  simdi: Date,
  testModu: boolean,
  provaModu = false
) {
  const ozet = {
    uretilen: 0,
    puanlanan: 0,
    hatirlatilan: 0,
    acilan: 0,
    fisilti: 0,
    senkron: 0,
    durtulen: 0,
    momentum: 0,
    orkestratorAtes: 0,
  };

  // [FAZ1-B] Nabız damgası: tik her koştuğunda (AYNA pasif olsa bile) iz bırakır —
  // NabizSeridi "son tik X dk önce"yi buradan okur; cron durursa şerit kırmızı yanar.
  await nabizVur(db, NABIZ_TIK);
  // [ADMIN-UX6] Çapraz bekçi: olaylar (dakikalık) 10 dk'dır sessizse adminlere push.
  await nabizBekcisi(db, NABIZ_OLAYLAR, 10);

  // 1) Süresi dolan görevleri kapat (her durumda, sessiz saatte bile)
  await db
    .from("missions")
    .update({ status: "expired" })
    .eq("status", "pending")
    .lt("due_at", simdi.toISOString());

  const { data: ayarlar } = await db
    .from("settings")
    .select("key, value")
    .in("key", [
      "ayna_aktif",
      "ayna_baslangic",
      "sistem_modu",
      "yolculuk_baslangic",
      "gorev_uretimi_durduruldu",
    ]);
  const ayar = new Map((ayarlar ?? []).map((a) => [a.key, a.value]));

  if (ayar.get("ayna_aktif") !== "true") {
    return { ozet: "AYNA uyuyor (pasif)", ...ozet };
  }

  // FAZ 9 — ORKESTRATÖR: zamanı gelmiş senaryo satırlarını ateşle (idempotent).
  // Kamp başlamadıysa (ayna_baslangic yok) sessizdir. Her tikin başında çalışır
  // ki bayrak açılışları görev üretiminden ÖNCE etkili olsun.
  try {
    const ork = await orkestratoduIsle(db, simdi, ayar.get("ayna_baslangic"));
    ozet.orkestratorAtes = ork.atesLenen;
  } catch {
    // orkestratör düşse bile tik akışını bozma
  }

  // FAZ 2.1 — 24 SAAT SESSİZLİK: kamp kapanışından (Gün 3 13:10) ilk yolculuk
  // görevine (kamp+~44s) kadar AYNA tüm görev/push üretimini durdurur. Bayrağı
  // orkestratör çevirir (kapanis_sessizlik_basla/bitir satırları); orkestratör
  // yukarıda ZATEN çalıştı, o yüzden "sessizliği bitir" ateşlenebildi. Son ekran
  // push'u ayrı bir orkestratör push satırıdır → o da orkestratörde ateşlenir.
  if (ayar.get("gorev_uretimi_durduruldu") === "true") {
    return { ozet: "Kamp sonrası sessizlik — üretim durduruldu", ...ozet };
  }

  const mod: SistemModu =
    ayar.get("sistem_modu") === "yolculuk" ? "yolculuk" : "kamp";
  const sessiz = sessizSaatMi(simdi, mod) && !testModu;
  // SAHNE SESSİZLİĞİ: kürsüde biri varken AYNA telefon titretmez —
  // görev, hatırlatma, fısıltı ve dürtmeler bir sonraki pencereye sarkar.
  const bugun = istanbulTarihi(simdi);
  const { saat, dakika } = istanbulSaati(simdi);
  // Kampın 1. günü = AYNA'nın başlatıldığı (ayna_baslangic) Istanbul tarihi.
  // Böylece Gün 1/2/3 sabit takvime değil, kullanıcının başlattığı ana bağlı.
  const aynaBaslangicAyar = ayar.get("ayna_baslangic");
  const kampBaslangic = aynaBaslangicAyar
    ? istanbulTarihi(new Date(aynaBaslangicAyar))
    : undefined;
  const kampGunuBugun = mod === "kamp" ? kampGunu(bugun, kampBaslangic) : null;
  const sahneSessiz =
    kampGunuBugun !== null &&
    sahneSessizMi(kampGunuBugun, saat * 60 + dakika) &&
    !testModu;
  const etkinlik = kampGunuBugun
    ? suankiMadde(kampGunuBugun, saat * 60 + dakika)
    : null;
  // GELİŞTİRME #7: az önce biten deneyimsel an (duygu sıcakken göreve bağla).
  const bitenEtkinlik = kampGunuBugun
    ? bitenMadde(kampGunuBugun, saat * 60 + dakika)
    : null;

  // 2) Gecikmiş puanlama — normalde yanıt anında puanlanır; bu, kurtarma hattı.
  // Limit 25: bir AI kesintisinde tüm kampın yanıtları "submitted"e düşebilir;
  // eski limit (2/tik) drenajı saatlerce uzatıyordu.
  const { data: bekleyenler } = await db
    .from("missions")
    .select("id, participant_id, kind, title, body, response_text, responded_at, due_at")
    .eq("status", "submitted")
    .limit(25);
  for (const g of bekleyenler ?? []) {
    if (!g.response_text) continue;
    let sonuc = await gorevPuanla(g, g.response_text);
    if (!sonuc) {
      // LİMBO GÜVENCESİ: puanlama 30+ dakikadır başarısızsa (model reddi /
      // kalıcı bozuk çıktı) görevi varsayılan sıcak yorumla mühürle — kişi
      // sonsuza dek "AYNA okuyor" ekranında bırakılmaz.
      const bekliyorMs = g.responded_at
        ? simdi.getTime() - new Date(g.responded_at).getTime()
        : 0;
      if (bekliyorMs < 30 * 60_000) continue;
      sonuc = { puan: 7, yorum: tr.gorevler.kurtarmaYorum, response_tags: [] };
    }
    const zamaninda =
      !!g.responded_at && new Date(g.responded_at) <= new Date(g.due_at);
    const kivilcim = kivilcimHesapla(sonuc.puan, zamaninda);
    await db
      .from("missions")
      .update({
        status: "scored",
        ai_score: sonuc.puan,
        ai_comment: sonuc.yorum,
        scored_at: simdi.toISOString(),
        spark_points: kivilcim,
        // #2 Kurtarma yolunda da response_tags kaydedilir
        ...(sonuc.response_tags.length > 0
          ? { response_tags: sonuc.response_tags }
          : {}),
      })
      .eq("id", g.id);
    ozet.puanlanan++;
    if (!sessiz && !sahneSessiz) {
      await katilimciyaBildir(
        db,
        g.participant_id,
        `AYNA puanladı: ${sonuc.puan}/10 ⚡`,
        sonuc.yorum
      );
      // FIERO: 10/10 — büyük ekran AYNA'nın sesiyle alkışlar,
      // yansıması da kişiye kendi sesiyle konuşur (Konuşan Yansıma kartı)
      if (sonuc.puan === 10) {
        const { data: kisi } = await db
          .from("participants")
          .select("full_name")
          .eq("id", g.participant_id)
          .maybeSingle();
        if (kisi) {
          await markaAnons(
            db,
            `anons/fiero-${g.id}.mp3`,
            `${kisi.full_name.split(" ")[0]}, az önce aynayı parlattı. On üzerinden on.`
          );
          await fieroSesi(db, g.participant_id, kisi.full_name);
        }
      }
    }
  }

  if (sessiz) {
    return { ozet: "Sessiz saat — AYNA fısıldamıyor", ...ozet };
  }

  // 3) Görev dağıtımı — kamp günü önce gerçek kamp tarihlerinden, yoksa
  // (prova) AYNA'nın ilk uyandırılma anından hesaplanır.
  const yolculukBaslangic = ayar.get("yolculuk_baslangic");
  const baslangic = ayar.get("ayna_baslangic");
  const gun =
    mod === "yolculuk" && yolculukBaslangic
      ? Math.min(90, yolculukGunuHesapla(yolculukBaslangic, simdi))
      : (kampGunuBugun ??
        (baslangic
          ? Math.min(
              4,
              Math.floor(
                (simdi.getTime() - new Date(baslangic).getTime()) / 86_400_000
              ) + 1
            )
          : 1));

  const [{ data: kisiler }, { data: sonGorevler }, { data: yanitGecmisi }] =
    await Promise.all([
      db.from("participants").select("id, full_name, team, phone, kariyer_seviyesi, kariyer_durumu, yeniden_giris_basamak").eq("role", "participant"),
      db
        .from("missions")
        .select("participant_id, status, issued_at, kind")
        .gte("issued_at", new Date(simdi.getTime() - 26 * 3_600_000).toISOString()),
      // #2 Pik yanıt saati için son 3 günlük yanıt geçmişi (responded_at).
      db
        .from("missions")
        .select("participant_id, responded_at")
        .not("responded_at", "is", null)
        .gte("responded_at", new Date(simdi.getTime() - 3 * 86_400_000).toISOString()),
    ]);

  // #2 Kişi başına pik yanıt saati (Istanbul). Yeterli/net veri yoksa null.
  const pikSaatleri = new Map<string, number | null>();
  {
    const saatHarita = new Map<string, number[]>();
    for (const y of yanitGecmisi ?? []) {
      if (!y.responded_at) continue;
      const trSaat = (new Date(y.responded_at).getUTCHours() + 3) % 24;
      const arr = saatHarita.get(y.participant_id) ?? [];
      arr.push(trSaat);
      saatHarita.set(y.participant_id, arr);
    }
    for (const [pid, saatler] of saatHarita) pikSaatleri.set(pid, pikSaatBul(saatler));
  }

  type Durum = { bekleyen: boolean; bugunSayisi: number; sonVerilis: number };
  const durumlar = new Map<string, Durum>();
  for (const g of sonGorevler ?? []) {
    const d =
      durumlar.get(g.participant_id) ??
      ({ bekleyen: false, bugunSayisi: 0, sonVerilis: 0 } as Durum);
    if (g.status === "pending" || g.status === "submitted") d.bekleyen = true;
    // #6 Günlük kota yalnız EYLEM görevlerini sayar; "senkron" kolektif/hafif bir
    // an olduğu için kişinin görev kotasını (gunlukUst) doldurmamalı.
    if (istanbulTarihi(new Date(g.issued_at)) === bugun && g.kind !== "senkron")
      d.bugunSayisi++;
    d.sonVerilis = Math.max(d.sonVerilis, new Date(g.issued_at).getTime());
    durumlar.set(g.participant_id, d);
  }

  const gunDk = saat * 60 + dakika;
  // Yolculuk modunda ritim sakindir: günde TEK görev, 09-11 sabah penceresi
  const gunlukUst = mod === "yolculuk" ? 1 : 7;
  const yolculukPenceresi = mod !== "yolculuk" || (saat >= 9 && saat < 11);
  const uygunlar = (kisiler ?? [])
    .filter((k) => {
      if (!yolculukPenceresi || sahneSessiz) return false;
      // #1 Cumartesi (Gün 2): grup David Chung'un kapalı oturumundaysa AYNA susar
      // (sahne sessizliği gibi) — görev sonraki açık pencereye sarkar. Oyun/yemek
      // bloklarında susmaz; oradaki "etkinliğe özel görev" tasarımı korunur.
      const grupNo = mod === "kamp" && gun === 2 ? grupNoCozumle(k.team) : null;
      if (grupNo && grupAktifBlok(grupNo, gunDk)?.tur === "david_toplanti") return false;
      const d = durumlar.get(k.id);
      if (!d) return true; // hiç görev almamış
      if (d.bekleyen || d.bugunSayisi >= gunlukUst) return false;
      // #3 Fırsat penceresi: az önce deneyimsel bir etkinlik bittiyse (genel kamp
      // veya grup) duygu sıcakken yakala — min aralık yarıya iner.
      const firsat =
        !!bitenEtkinlik || (grupNo ? grupBitenBlok(grupNo, gunDk) !== null : false);
      // #2 Pik saat: kişinin aktif olduğu saat biliniyorsa, o pencereden (±2 saat)
      // uzaktayken görevi geciktir — ölü saatte rahatsız etme. Fırsat penceresi
      // (sıcak an) bunu ezer; yolculuk modu kendi sabah penceresini kullanır.
      const pik = mod === "kamp" ? pikSaatleri.get(k.id) : null;
      if (pik != null && !firsat && saatFarki(saat, pik) > 2) return false;
      const aralikDk = gorevAraligiDk(k.id, d.bugunSayisi, firsat);
      return simdi.getTime() - d.sonVerilis >= aralikDk * 60_000;
    })
    // #6 Adalet: önce bugün EN AZ görev alan (taban eşitliği), sonra en uzun
    // süredir görev almayan. Sürekli yanıt veren biri herkesin önüne geçmesin.
    .sort((a, b) => {
      const da = durumlar.get(a.id);
      const db = durumlar.get(b.id);
      const fark = (da?.bugunSayisi ?? 0) - (db?.bugunSayisi ?? 0);
      if (fark !== 0) return fark;
      return (da?.sonVerilis ?? 0) - (db?.sonVerilis ?? 0);
    })
    // Prova kampında zaman hızlandırılmış: 25 kişiye çabuk dağıtım için limit açılır.
    .slice(0, provaModu ? 40 : 3);

  // FAZ 3 — EŞLEŞME WOW KATMANI bayrakları (varsayılan kapalı, tek sorguda).
  const { data: wowBayraklariHam } = await db
    .from("settings")
    .select("key, value")
    .in("key", [
      "johari_capraz_acik",
      "cift_gizli_gorev_acik",
      "tanik_gorevi_acik",
      "mini_konsey_acik",
      "kamp_zinciri_acik",
      "tahmin_sapmasi_acik",
      "altin_gorev_acik",
      "kume_gorev_acik",
      "iki_kapi_acik",
    ]);
  const wowAcikMi = new Map((wowBayraklariHam ?? []).map((s) => [s.key, s.value === "true"]));

  // FAZ 5.2 — ALTIN GÖREV: gün başına kamp geneli en fazla 3. Bu tik'te kaç
  // altın görev kaldığını bugünkü sayaçtan çıkar (settings kilidi yerine
  // gerçek missions sayımı — idempotent + prova uyumlu).
  const ALTIN_GUNLUK_UST = 3;
  let altinBugunKalan = 0;
  if (mod === "kamp" && wowAcikMi.get("altin_gorev_acik")) {
    const gunBasiUtc = new Date(`${bugun}T00:00:00+03:00`).toISOString();
    const { count: altinBugun } = await db
      .from("missions")
      .select("id", { count: "exact", head: true })
      .eq("altin", true)
      .gte("issued_at", gunBasiUtc);
    altinBugunKalan = Math.max(0, ALTIN_GUNLUK_UST - (altinBugun ?? 0));
  }

  // BU TİKTE GÖREV ALANLAR — `durumlar` haritası tik başında bir kez kurulur ve
  // görev eklendikçe GÜNCELLENMEZ (bayat kalır). Aynı tik içindeki sonraki
  // dağıtımlar (garantili, mentorluk) bu kümeye bakarak çift görev vermesin.
  const buTikGorevAlan = new Set<string>(uygunlar.map((u) => u.id));

  for (const k of uygunlar) {
    // Slice 3 — CUMARTESİ ETKİNLİK FARKINDALIĞI: Gün 2'de grup üyesine, grubunun
    // O ANKİ etkinliğine (David seansı, bowling, hazine avı, yemek...) özel görev
    // ver. AYNA etkinlik sırasında susmaz; göreve etkinliği katar (David'le foto/
    // soru, oyunda gözlem). Grup yoksa/çözülemezse genel kamp etkinliğine düşer.
    let kEtkinlik = etkinlik;
    let kBiten = bitenEtkinlik;
    let kIpucu: string | null = null;
    // #8 sıradaki etkinlik: genel kamp programından, Gün 2'de grup programından
    let kSiradaki =
      mod === "kamp" && kampGunuBugun ? siradakiMadde(kampGunuBugun, gunDk) : null;
    // #7 fiziksel yorgunluk: genel doğa bloğu veya Gün 2 grup fiziksel oyunu sonrası
    let kYorgun = bitenEtkinlik?.tur === "doga";
    if (mod === "kamp" && gun === 2) {
      const grupNo = grupNoCozumle(k.team);
      if (grupNo) {
        const cmt = cumartesiGrupEtkinligi(grupNo, gunDk);
        if (cmt) {
          kEtkinlik = cmt.madde;
          kIpucu = cmt.ipucu || null;
        }
        const cmtBiten = cumartesiGrupBitenEtkinlik(grupNo, gunDk);
        if (cmtBiten) kBiten = cmtBiten;
        const cmtSiradaki = cumartesiGrupSiradakiEtkinlik(grupNo, gunDk);
        if (cmtSiradaki) kSiradaki = cmtSiradaki;
        if (grupAzOnceFiziksel(grupNo, gunDk)) kYorgun = true;
      }
    }
    // FAZ 2.2 — MEKÂN-FARKINDA EŞLEŞTİRME: yalnız Gün 2 (Cumartesi grup programı
    // var), o an kişinin kendi grubunda olan ya da o an boşta (grupBostaMi) olan
    // adaylarla sınırlı. Program bilgisi yoksa null → mekân filtresi uygulanmaz.
    let kMekanFarkindaAdaylar: EslesmeAday[] | null = null;
    if (mod === "kamp" && gun === 2) {
      const kendiGrupNo = grupNoCozumle(k.team);
      if (kendiGrupNo) {
        kMekanFarkindaAdaylar = (kisiler ?? [])
          .filter((p) => p.id !== k.id)
          .filter((p) => {
            const pGrupNo = grupNoCozumle(p.team);
            if (!pGrupNo) return false;
            return pGrupNo === kendiGrupNo || grupBostaMi(pGrupNo, gunDk);
          })
          .map((p) => ({ id: p.id, full_name: p.full_name, team: p.team }));
      }
    }
    // FAZ 7.2 — SEBEP MOTORU: kişinin en son "neden kaçırdım" cevabı, bir
    // sonraki görevi biçimler. En son (24s içinde) süresi dolmuş görevinden oku.
    const gunOnce = new Date(simdi.getTime() - 24 * 3_600_000).toISOString();
    const { data: sonKacirma } = await db
      .from("missions")
      .select("kacirma_sebebi")
      .eq("participant_id", k.id)
      .eq("status", "expired")
      .not("kacirma_sebebi", "is", null)
      .gte("issued_at", gunOnce)
      .order("issued_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // FAZ 7.3 — YENİDEN GİRİŞ MERDİVENİ: kişi sessizleşip döndüyse (son görevleri
    // arka arkaya expire olduysa = kayan) ve normal basamaktaysa, basamağı 0'a
    // indir (nazik yeniden giriş). Basamak, tamamlamada gorev-yanit'te yükselir.
    const kBasamak = (k as { yeniden_giris_basamak?: number }).yeniden_giris_basamak ?? 2;
    let girisBasamak = kBasamak;
    const kayanMi = (durumlar.get(k.id)?.bugunSayisi ?? 0) === 0; // bugün hiç görev kapatmadı
    if (mod === "kamp" && kBasamak === 2 && sonKacirma?.kacirma_sebebi && kayanMi) {
      girisBasamak = 0;
      await db.from("participants").update({ yeniden_giris_basamak: 0 }).eq("id", k.id);
    }

    // [E6] GÖREV ÇEK — sessizleşip dönen kişiye (girisBasamak===0) tek AI görevi
    // yerine 3 KAPALI kart: birini çeker, diğerleri söner. İki Kapı (secim_grubu)
    // altyapısını genelleştirir; /api/kapi-sec seçileni açar, kalanları expire
    // eder. Nazik yeniden giriş: hafif, kısa, seçim özgürlüğü olan kartlar. AI
    // çağrısından ÖNCE — ucuz. Guard: açık çek yoksa üret (pile-up önle).
    if (mod === "kamp" && girisBasamak === 0) {
      const { count: acikCek } = await db
        .from("missions")
        .select("id", { count: "exact", head: true })
        .eq("participant_id", k.id)
        .eq("status", "secim_bekliyor");
      if ((acikCek ?? 0) === 0) {
        const cekGrubu = crypto.randomUUID();
        const cekDue = new Date(simdi.getTime() + 3 * 3_600_000).toISOString();
        const kartlar = [
          { kind: "bag", title: "Bir isim", body: "Az tanıdığın birine git; içten tek bir soru sor. Cevabından bir cümleyi bana yaz.", kapi_etiket: "🤝 bir isim" },
          { kind: "cesaret", title: "Bir eşik", body: "Ertelediğin, seni azıcık zorlayan küçük bir ilk adımı at. Ne yaptığını tek cümleyle yaz.", kapi_etiket: "🔥 bir eşik" },
          { kind: "serbest", title: "Bir cümle", body: "Şu an nasıl hissettiğini tek dürüst cümleyle bana yaz. Başlamanın en küçük hâli bu.", kapi_etiket: "✍️ bir cümle" },
        ];
        let cekYazildi = false;
        for (const kart of kartlar) {
          const { error: cekHata } = await db.from("missions").insert({
            participant_id: k.id,
            kind: kart.kind,
            title: kart.title,
            body: kart.body,
            kapi_etiket: kart.kapi_etiket,
            difficulty: 1,
            status: "secim_bekliyor",
            secim_grubu: cekGrubu,
            issued_at: simdi.toISOString(),
            due_at: cekDue,
          });
          if (!cekHata) cekYazildi = true;
        }
        if (cekYazildi) {
          ozet.uretilen++;
          await katilimciyaBildir(db, k.id, "🎴 Bir görev çek", "Üç kart açık — birini çek, gerisi sönsün.", "/gorevler");
        }
      }
      continue; // yeniden giriş: bu tik AI görevi üretme, çek sun
    }

    // Sıradaki köprüsünü yalnız kişi ŞU AN bir etkinliğin içinde DEĞİLken kur
    // (etkinlikteyse görev zaten ona bağlanıyor; çift bağlam karıştırır).
    const gorev = await gorevUret(
      db, k, gun, saat, mod, kEtkinlik, kBiten, kIpucu, kEtkinlik ? null : kSiradaki, kYorgun,
      kMekanFarkindaAdaylar,
      { sonKacirmaSebebi: sonKacirma?.kacirma_sebebi ?? null, girisBasamak }
    );
    if (!gorev) continue;

    // FAZ 3.2 — JOHARI ÇAPRAZ EŞLEŞTİRME: kota "bag" seçtiyse ve bayrak açıksa,
    // AI'lı görevin yerine deterministik/statik Johari görevini kullan (ucuz,
    // kör noktayı asla yüzüne vurmaz — yalnız hedefin gücünden söz eder).
    let johariOverride: Awaited<ReturnType<typeof johariCaprazGorevUret>> = null;
    if (gorev.kind === "bag" && wowAcikMi.get("johari_capraz_acik")) {
      johariOverride = await johariCaprazGorevUret(db, k, simdi);
    }

    // FAZ 5.4 — İKİ KAPI: ara sıra (bayrak açık + %15) tek görev yerine bir
    // SEÇİM sun — Kapı A = üretilen görev (doğal türü), Kapı B = karşıt lezzette
    // statik bir görev (cesaret↔bağ). İkisi de status="secim_bekliyor" +
    // ortak secim_grubu; kişi birini seçince öteki 'expired' olur (bkz.
    // /api/kapi-sec). secim_bekliyor bir aktif/bekleyen görev SAYILMAZ.
    if (
      wowAcikMi.get("iki_kapi_acik") &&
      !johariOverride &&
      Math.random() < 0.15
    ) {
      const secimGrubu = crypto.randomUUID();
      const kapiDueAt = new Date(simdi.getTime() + gorev.sure_saat * 3_600_000);
      const kapiAEtiket = gorev.kind === "cesaret" ? "🔥 bir eşik" : "🤝 bir isim";
      const kapiB =
        gorev.kind === "cesaret"
          ? { kind: "bag", etiket: "🤝 bir isim", title: "Bir isim", body: "Bugün az tanıdığın birine git; ona içten bir soru sor ya da gerçek bir takdir söyle. Konuştuklarınızdan bir cümleyi bana yaz." }
          : { kind: "cesaret", etiket: "🔥 bir eşik", title: "Bir eşik", body: "Bugün ertelediğin, seni biraz zorlayan bir ilk adımı at. Ne yaptığını ve nasıl hissettiğini tek cümleyle bana yaz." };
      const kapilar = [
        { participant_id: k.id, kind: gorev.kind, title: gorev.title, body: gorev.body, kapi_etiket: kapiAEtiket, somutluk: gorev.somutluk },
        { participant_id: k.id, kind: kapiB.kind, title: kapiB.title, body: kapiB.body, kapi_etiket: kapiB.etiket, somutluk: null },
      ];
      let kapiYazildi = false;
      for (const kapi of kapilar) {
        const { error: kapiHata } = await db.from("missions").insert({
          ...kapi,
          difficulty: gorev.difficulty,
          status: "secim_bekliyor",
          secim_grubu: secimGrubu,
          issued_at: simdi.toISOString(),
          due_at: kapiDueAt.toISOString(),
        });
        if (!kapiHata) kapiYazildi = true;
      }
      if (kapiYazildi) {
        ozet.uretilen++;
        await katilimciyaBildir(db, k.id, "🚪 AYNA sana bir seçim sunuyor", "İki kapı açıldı — birini seç.", "/gorevler");
      }
      continue; // normal görev insert'ini atla
    }

    // FAZ 5.2 — ALTIN GÖREV: bu görev nadir "altın" varyantı mı? Gün kotası
    // (altinBugunKalan) doluysa ve %25 şansla. (gorevUret yalnız normal görev
    // türleri üretir — senkron/soz/mentorluk zaten ayrı akışlardan gelir.)
    const altinMi = altinBugunKalan > 0 && Math.random() < 0.25;

    // #8 micro_sprint: sure_saat 0.5 = 30 dk
    const dueAt = new Date(simdi.getTime() + gorev.sure_saat * 3_600_000);
    const { data: yeniGorev, error } = await db
      .from("missions")
      .insert({
        participant_id: k.id,
        trait_id: johariOverride ? johariOverride.traitId : gorev.trait_id,
        kind: gorev.kind,
        title: johariOverride ? johariOverride.title : gorev.title,
        body: johariOverride ? johariOverride.body : gorev.body,
        difficulty: gorev.difficulty,
        neden: gorev.neden,
        fayda: gorev.fayda,
        ipuclari: gorev.ipuclari,
        micro_sprint: gorev.micro_sprint,
        yay_gorevi: gorev.yayGorevi,
        donus_bicimi: gorev.donusBicimi, // #7 çeşitlilik izlemesi
        somutluk: gorev.somutluk, // FAZ 1.1 — kim/ne/nerede/ne_zaman/kanit checklist
        altin: altinMi, // FAZ 5.2 — nadir altın görev (3x kıvılcım)
        // KRİTİK: issued_at motorun kullandığı saate (prova'da SANAL saat) eşit
        // olmalı. Aksi halde sonGorevler penceresi + bugunSayisi + sonVerilis +
        // bekleyen kontrolleri kayıyor ve prova'da her tik görev üretip sel oluyor.
        // Gerçek kampta simdi = gerçek now → değişiklik yok.
        issued_at: simdi.toISOString(),
        due_at: dueAt.toISOString(),
      })
      .select("id")
      .single();
    if (error || !yeniGorev) continue;
    // FAZ 5.2 — altın görev düştüyse: kotayı düş + HERKESE heyecan push'u
    // (kimde olduğu değil — yalnız "az önce birine düştü").
    if (altinMi) {
      altinBugunKalan--;
      await herkeseBildir(
        db,
        "⚡ Altın görev az önce birine düştü",
        "Kampta nadir bir altın görev belirdi. Belki sıradaki sende…",
        "/gorevler"
      );
    }
    // FAZ 2.1 / 3.2 — eşleşme kaydı: "aynı çift kampta bir kez" ve günlük hedef
    // kotası bu deftere dayanır; isimli olsun olmasın her eşleşme yazılır.
    const eslesmeIsimliMi = johariOverride ? true : (gorev.eslesme?.isimli ?? false);
    const eslesmeHedefId = johariOverride ? johariOverride.hedefId : (gorev.eslesme?.hedefId ?? null);
    if (eslesmeHedefId) {
      await eslesmeKaydet(db, yeniGorev.id, k.id, eslesmeHedefId, eslesmeIsimliMi);
    }

    // FAZ 3.1 — ÇİFT TARAFLI ASİMETRİK GİZLİ GÖREV: isimli bir eşleşme
    // görevi verildiyse, hedefe eş zamanlı gizli bir "beklenmedik soru"
    // görevi düşer. İkisi de diğerinin görevde olduğunu bilmez.
    if (eslesmeIsimliMi && eslesmeHedefId && wowAcikMi.get("cift_gizli_gorev_acik")) {
      const baglantiId = crypto.randomUUID();
      const { error: baglaHata } = await db
        .from("missions")
        .update({ baglanti_id: baglantiId })
        .eq("id", yeniGorev.id);
      if (!baglaHata) {
        const gizliMetin = gizliEsGorevMetni();
        const gizliDueAt = new Date(simdi.getTime() + 2 * 3_600_000);
        await db.from("missions").insert({
          participant_id: eslesmeHedefId,
          kind: "gizli",
          title: gizliMetin.title,
          body: gizliMetin.body,
          difficulty: gorev.difficulty,
          baglanti_id: baglantiId,
          issued_at: simdi.toISOString(),
          due_at: gizliDueAt.toISOString(),
        });
      }
    }

    // FAZ 3.3 — TANIK GÖREVİ: A'ya (k) cesaret görevi düştüyse ve mekân bilgisi
    // varsa (Gün 2), aynı mekândaki B'ye eşzamanlı "uzaktan izle" görevi düşer.
    // B'nin cevabı mevcut kanit_gorevi akışıyla A'ya anonim takdir olur.
    if (
      gorev.kind === "cesaret" &&
      wowAcikMi.get("tanik_gorevi_acik") &&
      kMekanFarkindaAdaylar &&
      kMekanFarkindaAdaylar.length > 0
    ) {
      const tanik = await eslesmeHedefiSec(db, k.id, kMekanFarkindaAdaylar, simdi);
      if (tanik) {
        const tanikMetin = tanikGoreviMetni(k.full_name.split(" ")[0]);
        const tanikDueAt = new Date(simdi.getTime() + 3_600_000);
        const { data: tanikGorevi } = await db
          .from("missions")
          .insert({
            participant_id: tanik.id,
            kind: "gozlem",
            title: tanikMetin.title,
            body: tanikMetin.body,
            difficulty: 1,
            issued_at: simdi.toISOString(),
            due_at: tanikDueAt.toISOString(),
          })
          .select("id")
          .single();
        if (tanikGorevi) {
          await eslesmeKaydet(db, tanikGorevi.id, k.id, tanik.id, true);
          await db.from("kanit_gorevi").insert({
            mission_id: tanikGorevi.id,
            gozlemci_id: tanik.id,
            hedef_id: k.id,
            hedef_ad: k.full_name,
          });
        }
      }
    }

    ozet.uretilen++;
    await katilimciyaBildir(
      db,
      k.id,
      `🤖 AYNA'dan yeni görev: ${gorev.title}`,
      gorev.body.length > 120 ? gorev.body.slice(0, 117) + "…" : gorev.body,
      "/gorevler" // A3: bildirimden doğrudan görev ekranına
    );
    // Ses katmanı: simülasyonda İTİRAZCI konuşur (stok ses, herkese);
    // gizli/cesarette YANSIMAN fısıldar (klon, bütçeli)
    if (gorev.kind === "simulasyon" && gorev.itiraz) {
      await itirazSesi(db, k.id, yeniGorev.id, gorev.itiraz);
    } else if (gorev.kind === "gizli" || gorev.kind === "cesaret") {
      await gorevSeslendir(db, k.id, yeniGorev.id, gorev.title, gorev.body);
    }
  }

  // 3a-bis) GARANTİLİ GÖREVLER — kamp boyunca HER katılımcıya tam bir kez verilen
  // küratörlü "wow" görevleri (lib/garantiliGorevler.ts). Kişi boştayken (bekleyen
  // görevi yokken), kotası dolmamışken ve son garantili görevden ≥3 saat geçmişken
  // sıradaki VERİLMEMİŞ garantili görevi verir; teslim garantili_gorev_kayit'a
  // yazılır → aynı kişiye iki kez gitmez, kamp bitmeden herkese ulaşır. Statik
  // içerik (AI yok → ucuz, güvenilir). Bu tikte normal görev seçilenler atlanır.
  if (!sahneSessiz && GARANTILI_GOREVLER.length > 0) {
    const GARANTI_ARALIK_MS = 3 * 3_600_000; // aynı kişiye iki garantili görev arası min
    const GARANTI_TIK_UST = 4; // tik başına en fazla (bildirim seli olmasın)
    const aktifIdler = (kisiler ?? []).map((k) => k.id);
    if (aktifIdler.length > 0) {
      const { data: kayitlar } = await db
        .from("garantili_gorev_kayit")
        .select("participant_id, kod, created_at")
        .in("participant_id", aktifIdler);
      const verilen = new Map<string, { kodlar: Set<string>; son: number }>();
      for (const r of kayitlar ?? []) {
        const v = verilen.get(r.participant_id) ?? { kodlar: new Set<string>(), son: 0 };
        v.kodlar.add(r.kod);
        v.son = Math.max(v.son, new Date(r.created_at).getTime());
        verilen.set(r.participant_id, v);
      }
      let ozellikAd: Map<string, number> | null = null; // trait adı → id (tembel yükle)
      let garantiVerilen = 0;
      for (const k of (kisiler ?? []) as { id: string }[]) {
        if (garantiVerilen >= GARANTI_TIK_UST) break;
        if (buTikGorevAlan.has(k.id)) continue; // bu tikte zaten görev seçildi
        const d = durumlar.get(k.id);
        if (d?.bekleyen || (d?.bugunSayisi ?? 0) >= gunlukUst) continue;
        const v = verilen.get(k.id) ?? { kodlar: new Set<string>(), son: 0 };
        if (v.son && simdi.getTime() - v.son < GARANTI_ARALIK_MS) continue; // aralık dolmadı
        const garanti = siradakiGarantiliGorev(v.kodlar);
        if (!garanti) continue; // hepsini almış
        if (!ozellikAd) {
          const oz = await aktifOzellikler(db);
          ozellikAd = new Map(oz.map((o) => [o.name, o.id]));
        }
        const dueAt = new Date(simdi.getTime() + garanti.sureSaat * 3_600_000);
        const { data: yeni, error } = await db
          .from("missions")
          .insert({
            participant_id: k.id,
            trait_id: ozellikAd.get(garanti.traitAd) ?? null,
            kind: garanti.kind,
            title: garanti.title,
            body: garanti.body,
            difficulty: garanti.difficulty,
            neden: garanti.neden,
            fayda: garanti.fayda,
            issued_at: simdi.toISOString(),
            due_at: dueAt.toISOString(),
          })
          .select("id")
          .single();
        if (error || !yeni) continue;
        // Teslimi işaretle. Yarış/çift teslimde unique ihlali → görevi geri al.
        const { error: kayitHata } = await db
          .from("garantili_gorev_kayit")
          .insert({ participant_id: k.id, kod: garanti.kod, mission_id: yeni.id });
        if (kayitHata) {
          await db.from("missions").delete().eq("id", yeni.id);
          continue;
        }
        buTikGorevAlan.add(k.id); // sonraki dağıtımlar (mentorluk) çift görev vermesin
        garantiVerilen++;
        ozet.uretilen++;
        await katilimciyaBildir(
          db,
          k.id,
          `🤖 AYNA'dan özel görev: ${garanti.title}`,
          garanti.body.length > 120 ? garanti.body.slice(0, 117) + "…" : garanti.body,
          "/gorevler",
        );
      }
    }
  }

  // 3b) YANSIMA VİDEOLARI: ÖNDEN ÜRETİM modeli — videolar kamp öncesi harici
  // olarak (MCP) üretilip /admin/yansima'dan yüklenir. Cron ASLA otomatik
  // üretim başlatmaz (kullanıcı kararı). Burada yalnız: admin'in elle
  // tetiklediği (uretiliyor) bir iş varsa indir, ve hazır olanı fısılda.
  if (higgsYapilandirildiMi()) {
    const { data: surenler } = await db
      .from("voice_profiles")
      .select("participant_id, video_request_id")
      .eq("video_status", "uretiliyor")
      .not("video_request_id", "is", null)
      .limit(3);
    for (const s of surenler ?? []) {
      const d = await yansimaDurumu(s.video_request_id!);
      if (d.durum === "bekliyor") continue;
      if (d.durum === "hata") {
        await db
          .from("voice_profiles")
          .update({ video_status: "hata" })
          .eq("participant_id", s.participant_id);
        continue;
      }
      try {
        const yanit = await fetch(d.videoUrl);
        if (!yanit.ok) continue; // geçici: sonraki tikte yeniden dene
        const bayt = Buffer.from(await yanit.arrayBuffer());
        const yolu = `${s.participant_id}/yansima.mp4`;
        const yukleme = await db.storage
          .from("sesler")
          .upload(yolu, bayt, { contentType: "video/mp4", upsert: true });
        if (yukleme.error) continue;
        await db
          .from("voice_profiles")
          .update({ video_status: "hazir", video_path: yolu })
          .eq("participant_id", s.participant_id);
      } catch {
        // indirme takıldı: durum değişmez, sonraki tik dener
      }
    }

    const { data: hazirlar } = sahneSessiz
      ? { data: [] }
      : await db
          .from("voice_profiles")
          .select("participant_id")
          .eq("video_status", "hazir")
          .is("video_notified_at", null)
          .limit(5);
    for (const h of hazirlar ?? []) {
      await katilimciyaBildir(
        db,
        h.participant_id,
        "👁 Aynan seni gördü",
        "Suya bak — yansıman seni bekliyor.",
        "/yansiman"
      );
      await db
        .from("voice_profiles")
        .update({ video_notified_at: simdi.toISOString() })
        .eq("participant_id", h.participant_id);
    }
  }

  // 3b3) AYNA ANI (otomatik): kamp içinde yeterince görev yapmış + kör nokta
  // cümlesi yazmış kişilere, AYNA o cümleyi bugünkü çabalarıyla yüzleştiren
  // "gördün mü?" anını üretir, mühürler ve bildirir. Olgunluğa bağlıdır (zaman
  // değil), kişi başına bir kez. Tik başına ≤2 (Opus maliyeti). Eskiden admin
  // AYNA Direktörü'nden elle tetikliyordu — artık sistem o an geldiğinde gönderir.
  if (mod === "kamp" && !sahneSessiz) {
    const aniAdaylar = await aynaAniAdaylari(db);
    for (const aday of aniAdaylar.slice(0, 2)) {
      const govde = await aynaAniUret(db, { id: aday.id, full_name: aday.ad });
      if (!govde) continue;
      const { error: aniHata } = await db
        .from("mirror_moments")
        .upsert(
          { participant_id: aday.id, body: govde },
          { onConflict: "participant_id", ignoreDuplicates: true }
        );
      if (aniHata) continue;
      await katilimciyaBildir(
        db,
        aday.id,
        "👁 Aynan sana bir şey gösteriyor",
        "Bugün yaptıkların aynada bir şey değiştirdi. Bak.",
        "/"
      );
      ozet.fisilti++;
    }
  }

  // 3b4) GRUP ÖDEVİ (otomatik): takım oluşmuş + profilli üyesi olan + henüz aktif
  // ödevi olmayan (takım × tip) için AYNA grup ödevi üretir ve o takımın üyelerine
  // bildirir. Olgunluğa bağlı (takım + profil), zaman değil; tik başına ≤3 üretim
  // (Opus maliyeti). Eskiden admin Grup Ödevleri sayfasından elle üretiyordu.
  if (mod === "kamp" && !sahneSessiz) {
    const takimlar = [
      ...new Set(
        (kisiler ?? []).map((k) => k.team).filter((t): t is string => !!t)
      ),
    ];
    if (takimlar.length > 0) {
      const { data: mevcutOdev } = await db
        .from("grup_odev")
        .select("takim, tip")
        .eq("aktif", true);
      const olan = new Set((mevcutOdev ?? []).map((o) => `${o.takim}|${o.tip}`));
      const uyeler = new Map<string, string[]>();
      for (const k of kisiler ?? []) {
        if (!k.team) continue;
        const arr = uyeler.get(k.team) ?? [];
        arr.push(k.id);
        uyeler.set(k.team, arr);
      }
      let grupUretim = 0;
      for (const takim of takimlar) {
        if (grupUretim >= 3) break;
        for (const tip of ["grup_ici", "grup_birlikte"] as const) {
          if (grupUretim >= 3) break;
          if (olan.has(`${takim}|${tip}`)) continue;
          const sonuc = await grupOdevUret(db, takim, tip);
          if (!sonuc) continue;
          grupUretim++;
          for (const uid of uyeler.get(takim) ?? []) {
            await katilimciyaBildir(
              db,
              uid,
              "🤝 Grubunun yeni ödevi var",
              sonuc.baslik,
              "/grup"
            );
          }
        }
      }
      if (grupUretim > 0) ozet.uretilen += grupUretim;
    }
  }

  // 3b2) SABAH YOKLAMASI: kamp Gün 2+ sabahları kendi sesinden günaydın.
  // Pencereler programa dikili: Gün 2 trekking öncesi 06:40-08:00,
  // Gün 3 kahvaltı boyunca 07:00-08:45; kamp tarihi dışında (prova)
  // 07:35-09:00. Tik başına ≤8 üretim; morning_date tekrarları engeller.
  if (mod === "kamp" && gun >= 2) {
    const sabahPenceresi = kampGunuBugun
      ? sabahPenceresiMi(kampGunuBugun, saat, dakika)
      : (saat === 7 && dakika >= 35) || saat === 8;
    if (sabahPenceresi) {
      const { data: sabahBekleyen } = await db
        .from("voice_profiles")
        .select("participant_id")
        .eq("status", "klonlandi")
        .or(`morning_date.is.null,morning_date.neq.${bugun}`)
        .limit(8);
      if ((sabahBekleyen ?? []).length > 0) {
        const dunBasi = new Date(
          new Date(`${bugun}T00:00:00+03:00`).getTime() - 86_400_000
        ).toISOString();
        const { data: dunPuanlar } = await db
          .from("ratings")
          .select("target_id, is_self")
          .gte("created_at", dunBasi)
          .lt("created_at", new Date(`${bugun}T00:00:00+03:00`).toISOString());
        const gozlemler = new Map<string, number>();
        for (const p of dunPuanlar ?? []) {
          if (p.is_self) continue;
          gozlemler.set(p.target_id, (gozlemler.get(p.target_id) ?? 0) + 1);
        }
        const adlar = new Map((kisiler ?? []).map((k) => [k.id, k.full_name]));
        for (const s of sabahBekleyen ?? []) {
          const ad = adlar.get(s.participant_id);
          if (!ad) continue;
          const oldu = await sabahSesi(
            db,
            s.participant_id,
            ad,
            gozlemler.get(s.participant_id) ?? 0,
            bugun
          );
          if (oldu) {
            await katilimciyaBildir(
              db,
              s.participant_id,
              "🌅 Aynan günaydın diyor",
              "Güne kendi sesinle başla — kısa bir mesajın var.",
              "/"
            );
          }
        }
      }
    }
  }

  // 3b3) AYNA ANALİZİ: kamp aşamalarında kişiye dair derin analiz + kendi sesi.
  // Aşamalar: 1. akşam (Gün 1, 21:00+), 2. akşam (Gün 2, 23:30), kamp çıkışı
  // (Gün 3, 14:00+). unique(participant,asama) tekrarı engeller; tik başına ≤6
  // üretim. Kamp öncesi analiz mühür ekranında talep üzerine üretilir (burada değil).
  if (mod === "kamp") {
    let analizAsama: AsamaKod | null = null;
    if (gun === 1 && saat >= 21) analizAsama = "aksam_1";
    else if (gun === 2 && saat === 23 && dakika >= 30) analizAsama = "aksam_2";
    else if (gun >= 3 && saat >= 14) analizAsama = "cikis";
    if (analizAsama && (kisiler ?? []).length > 0) {
      const uretilenler = await kampAnaliziTik(
        db,
        analizAsama,
        (kisiler ?? []).map((k) => ({ id: k.id, full_name: k.full_name })),
        6
      );
      if (uretilenler.length > 0) {
        ozet.uretilen += uretilenler.length;
        for (const pid of uretilenler) {
          await katilimciyaBildir(
            db,
            pid,
            "Aynan derinleşti",
            "Sana dair yeni bir analiz var — kendi sesinle dinle.",
            "/analizlerim"
          );
        }
      }
    }
  }

  // 3c) SENKRON AN: herkese aynı anda aynı mikro görev (ambient sociability).
  // Pencere anahtarı settings kilidiyle tek seferliktir; üretim düşerse
  // deterministik yedek görev devreye girer — an asla boş geçmez.
  {
    const tarihParcalari = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Istanbul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "short",
    }).formatToParts(simdi);
    const haftaninGunu = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(
      tarihParcalari.find((p) => p.type === "weekday")?.value ?? ""
    );
    const anahtar = senkronAnahtari({
      mod,
      haftaninGunu,
      saat,
      dakika,
      tarih: bugun,
      baslangic: kampBaslangic,
    });
    if (anahtar) {
      const { error: kilitHatasi } = await db
        .from("settings")
        .insert({ key: anahtar, value: "1" });
      // kilit alınamadıysa (zaten var) bu pencere işlenmiştir
      if (!kilitHatasi) {
        const uretilen =
          (await senkronGorevUret(mod)) ?? senkronYedekSec(anahtar);
        const dueAt = new Date(simdi.getTime() + 20 * 60_000).toISOString();
        const satirlar = (kisiler ?? []).map((k) => ({
          participant_id: k.id,
          kind: "senkron",
          title: uretilen.baslik,
          body: uretilen.govde,
          difficulty: 1,
          due_at: dueAt,
        }));
        if (satirlar.length > 0) {
          const { error: senkronHata } = await db.from("missions").insert(satirlar);
          if (!senkronHata) {
            ozet.senkron = satirlar.length;
            await herkeseBildir(
              db,
              "⏰ SENKRON AN",
              `${uretilen.baslik} — şu anda herkes bunu yapıyor. 20 dakikan var.`,
              "/gorevler"
            );
          }
        }
      }
    }
  }

  // 3d) KAYMA (CHURN) RADARI: sessizleşeni önce nazikçe dürt, eşik aşılırsa
  // lidere işaretle. Saat başı bir kez çalışır (settings kilidi).
  {
    const kaymaAnahtari = `kayma_${bugun}_${saat}`;
    const { error: kaymaKilit } = await db
      .from("settings")
      .insert({ key: kaymaAnahtari, value: "1" });
    if (!kaymaKilit) {
      const yedi = new Date(simdi.getTime() - 7 * 86_400_000).toISOString();
      const [
        { data: sonYanitlar },
        { data: sonPuanlar },
        { data: radar },
        { data: cumleler },
      ] = await Promise.all([
        db
          .from("missions")
          .select("participant_id, responded_at")
          .gte("responded_at", yedi),
        db.from("ratings").select("rater_id, created_at").gte("created_at", yedi),
        db.from("churn_radar").select("participant_id, nudged_at, admin_alerted_at, wa_sent_at"),
        // FAZ 2 re-entry: nüks anında geri çalınacak yeni cümleler
        db.from("bosluk_ani").select("participant_id, yeni_cumle").not("yeni_cumle", "is", null),
      ]);
      const cumleHarita = new Map(
        (cumleler ?? []).map((c) => [c.participant_id, c.yeni_cumle as string])
      );
      const sonEtkinlik = new Map<string, number>();
      for (const y of sonYanitlar ?? []) {
        if (!y.responded_at) continue;
        const t = new Date(y.responded_at).getTime();
        if (t > (sonEtkinlik.get(y.participant_id) ?? 0))
          sonEtkinlik.set(y.participant_id, t);
      }
      for (const p of sonPuanlar ?? []) {
        const t = new Date(p.created_at).getTime();
        if (t > (sonEtkinlik.get(p.rater_id) ?? 0)) sonEtkinlik.set(p.rater_id, t);
      }
      const radarHarita = new Map(
        (radar ?? []).map((r) => [r.participant_id, r])
      );
      for (const k of kisiler ?? []) {
        const iz = radarHarita.get(k.id);
        const karar = kaymaKarari(
          sonEtkinlik.get(k.id) ?? null,
          simdi.getTime(),
          mod,
          iz?.nudged_at ? new Date(iz.nudged_at).getTime() : null,
          iz?.admin_alerted_at ? new Date(iz.admin_alerted_at).getTime() : null
        );
        // Sahne sessizliğinde kişiye dürtme ertelenir (sonraki saate sarkar);
        // lider uyarısı sessiz kayıttır, sahnede de işlenebilir.
        const durtulebilir = karar.nudge && !sahneSessiz;
        // [E8] KAMP İÇİ KAYIP RADARI: kamp modunda drift onaylanınca (alert) +
        // telefon varsa + daha önce gönderilmediyse "seni özledik" WhatsApp'ı
        // (giden Meta-onaylı şablon; webhook'a dokunulmaz). Tek seferlik (wa_sent_at).
        let waGonderildi = false;
        const kTel = (k as { phone?: string | null }).phone ?? null;
        if (karar.alert && mod === "kamp" && !iz?.wa_sent_at && kTel) {
          waGonderildi = await kampKayipWhatsApp(db, k.full_name, kTel).catch(() => false);
        }
        if (durtulebilir || karar.alert || waGonderildi) {
          await db.from("churn_radar").upsert({
            participant_id: k.id,
            ...(durtulebilir ? { nudged_at: simdi.toISOString() } : {}),
            ...(karar.alert ? { admin_alerted_at: simdi.toISOString() } : {}),
            ...(waGonderildi ? { wa_sent_at: simdi.toISOString() } : {}),
            updated_at: simdi.toISOString(),
          });
        }
        if (durtulebilir) {
          // Önce kendi sesinden mektup üretmeyi dene; sonra bildir
          const sesli = await kaymaSesi(db, k.id, k.full_name);
          // FAZ 2 reconsolidation bakımı: yeni cümle varsa onu geri çal —
          // nüks tam burada olur, çelişkiyi (yeni kimliği) o anda yeniden teslim et.
          const cumle = cumleHarita.get(k.id);
          await katilimciyaBildir(
            db,
            k.id,
            cumle
              ? "👁 Cümleni hatırla"
              : sesli
                ? "🌊 Yansımandan sesli mesaj var"
                : "🌊 Su seni özledi",
            cumle
              ? `Kampta kendine şunu yazmıştın: "${cumle}". Eski cümle şu an kıpırdıyor olabilir — bugün küçücük bir adım yenisini yeniden doğrular.`
              : sesli
                ? "Kendi sesinden bir şey söylemek istiyor. Aç ve dinle."
                : "Bir süredir sessizsin. Bu bir azar değil, bir el uzatma: küçücük bir adım bile suyu halkalandırır.",
            "/"
          );
          ozet.durtulen += 1;
        }
      }
    }
  }

  // 3e) HAFTALIK MOMENTUM: Cuma 17:00-17:09 penceresinde bir kez — herkese
  // davranış-eğilim skoru yazılır ve kişisel push gider.
  {
    const cumaMi =
      new Intl.DateTimeFormat("en-US", {
        timeZone: "Europe/Istanbul",
        weekday: "short",
      }).format(simdi) === "Fri";
    if (cumaMi && saat === 17 && dakika < 10) {
      const momentumAnahtari = `momentum_${bugun}`;
      const { error: momentumKilit } = await db
        .from("settings")
        .insert({ key: momentumAnahtari, value: "1" });
      if (!momentumKilit) {
        const sonuc = await momentumHesaplaVeYaz(db, simdi);
        ozet.momentum = sonuc.yazilan;
      }
    }
  }

  // 3f) HAFTALIK AKRAN CHECK-IN: yolculuk modunda Pazartesi 10:00-10:09'da
  // ikilisi olan herkese "ortağına yaz" dürtüsü (settings kilidiyle bir kez).
  if (mod === "yolculuk") {
    const pazartesiMi =
      new Intl.DateTimeFormat("en-US", {
        timeZone: "Europe/Istanbul",
        weekday: "short",
      }).format(simdi) === "Mon";
    if (pazartesiMi && saat === 10 && dakika < 10) {
      const { error: ortakKilit } = await db
        .from("settings")
        .insert({ key: `ortak_hatirlatma_${bugun}`, value: "1" });
      if (!ortakKilit) {
        const { data: ikililer } = await db.from("pairs").select("a_id, b_id");
        const idler = new Set<string>();
        for (const ik of ikililer ?? []) {
          idler.add(ik.a_id);
          idler.add(ik.b_id);
        }
        for (const pid of idler) {
          await katilimciyaBildir(
            db,
            pid,
            "🤝 Ortağına bu hafta yaz",
            "Bu haftaki adımını ortağınla paylaş — birbirinizi ayakta tutun.",
            "/ortak"
          );
        }
      }
    }
  }

  // 3g) HAFTALIK SÖZ HATIRLATMA: yolculuk modunda Çarşamba 10:00-10:09'da
  // hedefine ulaşmamış söz sahiplerine kendi sözünü hatırlat (haftada bir).
  if (mod === "yolculuk") {
    const carsambaMi =
      new Intl.DateTimeFormat("en-US", {
        timeZone: "Europe/Istanbul",
        weekday: "short",
      }).format(simdi) === "Wed";
    if (carsambaMi && saat === 10 && dakika < 10) {
      const { error: sozKilit } = await db
        .from("settings")
        .insert({ key: `soz_hatirlatma_${bugun}`, value: "1" });
      if (!sozKilit) {
        const { data: sozler } = await db
          .from("pledges")
          .select("participant_id, agustos_gorusme, gorusme_yapilan");
        for (const s of sozler ?? []) {
          if (s.gorusme_yapilan >= s.agustos_gorusme) continue;
          const kalan = s.agustos_gorusme - s.gorusme_yapilan;
          await katilimciyaBildir(
            db,
            s.participant_id,
            "🤝 Sözünü hatırla",
            `Ağustos görüşme sözüne ${kalan} kaldı. İlerlemeni gir, hedefe yürü.`,
            "/soz"
          );
        }
      }
    }
  }

  // 4) Teslim hatırlatması — bitiş süresine ~15 dk kala, HENÜZ YAPILMAMIŞ
  // görev(ler) için KİŞİ BAŞINA TEK hatırlatma: push (abone ise) + WhatsApp
  // (onaylı "odev" şablonu varsa). Birikmiş tüm görevleri tek mesajla kapsar;
  // görev yapıldıysa (status değişti) listeye girmez, mesaj gitmez. Söz/senkron
  // gibi "ödev olmayan" türler dışarıda. Sahnedeyken susar.
  // PROVA (36× hızlandırılmış): gerçek telefonları yakmamak için WhatsApp KAPALI
  // — push yine gider, deneyim hissedilir.
  const { data: yaklasanlar } = sahneSessiz
    ? { data: [] }
    : await db
        .from("missions")
        .select("id, participant_id, title, kind")
        .eq("status", "pending")
        .is("reminded_at", null)
        .gt("due_at", simdi.toISOString())
        .lt("due_at", new Date(simdi.getTime() + 15 * 60_000).toISOString())
        .limit(80);

  // Kişi başına grupla (söz/senkron hariç).
  const hatirlatHarita = new Map<string, { idler: string[]; ilkBaslik: string }>();
  for (const g of yaklasanlar ?? []) {
    if (g.kind === "soz" || g.kind === "senkron") continue;
    const k = hatirlatHarita.get(g.participant_id) ?? { idler: [], ilkBaslik: g.title };
    k.idler.push(g.id);
    hatirlatHarita.set(g.participant_id, k);
  }

  if (hatirlatHarita.size > 0) {
    // WhatsApp: yalnız gerçek kampta (prova değil) + yapılandırma + onaylı şablon.
    let odevSid: string | null = null;
    if (!provaModu && whatsAppYapilandirildiMi()) {
      const sablon = sablonBul("odev");
      odevSid = sablon ? await sablonSidGetir(db, sablon) : null;
    }
    const { data: hkisiler } = await db
      .from("participants")
      .select("id, full_name, phone, login_code")
      .in("id", [...hatirlatHarita.keys()]);
    const hkisiHarita = new Map((hkisiler ?? []).map((k) => [k.id, k]));

    for (const [pid, veri] of hatirlatHarita) {
      const adet = veri.idler.length;
      // Push (abone ise) — bir taşla iki kuş
      await katilimciyaBildir(
        db,
        pid,
        "⏳ AYNA bekliyor…",
        adet > 1
          ? `${adet} görevin için son 15 dakika. Yanındayım, başarabilirsin.`
          : `"${veri.ilkBaslik}" görevin için son 15 dakika. Yanındayım, başarabilirsin.`,
        "/gorevler"
      );
      // WhatsApp (onaylı şablon + geçerli telefon + kod varsa) — link tıklayınca
      // /giris?kod ile otomatik girer; kuramamış olsa bile tarayıcıdan ulaşır.
      const kisi = hkisiHarita.get(pid);
      if (odevSid && kisi?.phone && kisi.full_name && kisi.login_code) {
        await whatsAppGonder(kisi.phone, odevSid, {
          "1": ilkAd(kisi.full_name),
          "2": kisi.login_code,
        });
      }
      // Hepsini hatırlatıldı işaretle — tekrar mesaj gitmesin.
      await db.from("missions").update({ reminded_at: simdi.toISOString() }).in("id", veri.idler);
      ozet.hatirlatilan++;
    }
  }

  // 5) Program duyuruları (başlamadan reveal_minutes önce, herkese)
  const { data: maddeler } = await db
    .from("schedule_items")
    .select("id, starts_at, title, location, reveal_minutes")
    .eq("revealed", false)
    .gt("starts_at", new Date(simdi.getTime() - 3_600_000).toISOString())
    .order("starts_at")
    .limit(3);
  for (const m of maddeler ?? []) {
    const acilma = new Date(m.starts_at).getTime() - m.reveal_minutes * 60_000;
    if (acilma > simdi.getTime()) continue;
    const saatYazi = new Intl.DateTimeFormat("tr-TR", {
      timeZone: "Europe/Istanbul",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(m.starts_at));
    await herkeseBildir(
      db,
      `📅 AYNA açıklıyor: ${m.title}`,
      `${saatYazi}${m.location ? ` · ${m.location}` : ""} — Nedenini orada anlayacaksın.`
    );
    await db.from("schedule_items").update({ revealed: true }).eq("id", m.id);
    // Sahne anonsu: AYNA'nın marka sesi perdeden duyurur
    await markaAnons(
      db,
      `anons/program-${m.id}.mp3`,
      `Saat ${saatYazi}. ${m.title}.${m.location ? ` Yer: ${m.location}.` : ""} Nedenini orada anlayacaksınız.`
    );
    await db.from("settings").upsert({
      key: "sahne_anons",
      value: `${m.id}:${simdi.toISOString()}`,
      updated_at: simdi.toISOString(),
    });
    ozet.acilan++;
  }

  // 5b) PROGRAM HATIRLATMASI: sabit programdaki yaklaşan DENEYİMSEL etkinlikten
  // (~10 dk önce) herkese TEK seferlik "sıradaki: X" push'u → Program sekmesine.
  // Yalnız kamp gününde + sahne sessizliği dışında (sessiz saat yukarıda zaten
  // elendi). Yemek/ara/serbest dahil değil (yaklasanEtkinlik filtreler). Settings
  // kilidi blok başına tek atış garantiler.
  if (kampGunuBugun && !sahneSessiz) {
    const yaklasan = yaklasanEtkinlik(kampGunuBugun, gunDk, 12);
    if (yaklasan) {
      const anahtar = `program_uyari_${bugun}_${kampGunuBugun}_${yaklasan.baslangic}`;
      const { error: kilit } = await db
        .from("settings")
        .insert({ key: anahtar, value: "1" });
      if (!kilit) {
        const kalanDk = dakikaCevir(yaklasan.baslangic) - gunDk;
        await herkeseBildir(
          db,
          `⏰ ${kalanDk} dk sonra: ${yaklasan.baslik}`,
          `Sıradaki etkinlik yaklaşıyor${yaklasan.konusmaci ? ` · ${yaklasan.konusmaci}` : ""}. Programın gerisinde kalma — Program'a göz at.`,
          "/program"
        );
        ozet.acilan++;
      }
    }
  }

  // 6a) SABAH ÖZLÜ SÖZ: 08:00-09:00 arasında, günde bir kez, herkese kendi
  // Pusula iç engel kategorisine göre seçilmiş bir söz push'la gönder.
  // Pusula dolmamışsa varsayılan → liderlik kategorisi.
  if (saat === 8 && !sahneSessiz) {
    const sabahSozAnahtari = `sabah_soz_${bugun}`;
    const { data: sozGonderilmis } = await db
      .from("settings")
      .select("key")
      .eq("key", sabahSozAnahtari)
      .maybeSingle();
    if (!sozGonderilmis) {
      await db.from("settings").upsert({ key: sabahSozAnahtari, value: "1" });
      // Pusula iç engel kategorilerini tek sorguda çek
      const { data: pusulalar } = await db
        .from("pusula")
        .select("participant_id, ic_engel_kat")
        .not("tamamlandi_at", "is", null);
      const engelHarita = new Map(
        (pusulalar ?? []).map((p) => [p.participant_id, p.ic_engel_kat as string | null])
      );
      for (const k of kisiler ?? []) {
        const engelKat = engelHarita.get(k.id) ?? null;
        // Kariyer hâli (A/B/C) varsa persona sözü; kamp zirvesinde merkez cümle;
        // yoksa Pusula iç engeline göre genel banka.
        const soz = gunlukSoz({
          hal: k.kariyer_durumu,
          icEngelKat: engelKat,
          gun,
          kampGunu: kampGunuBugun,
        });
        await katilimciyaBildir(
          db,
          k.id,
          "✨ Bugünün sözü",
          `"${soz.metin}" — ${soz.kaynak}`,
          "/"
        );
        ozet.fisilti++;
      }
    }
  }

  // 6aa) MENTORLUK GÖREVİ: 10:00-11:00 arasında, günde bir kez, her katılımcıya
  // kariyer seviyesine göre 3 mentor adayı içeren görev verilir.
  // Normal görev kotasının dışındadır — kendi kilidiyle ayrı çalışır.
  if (saat === 10 && !sahneSessiz) {
    const mentorlukAnahtari = `mentorluk_${bugun}`;
    const { data: mentorlukGonderilmis } = await db
      .from("settings")
      .select("key")
      .eq("key", mentorlukAnahtari)
      .maybeSingle();
    if (!mentorlukGonderilmis) {
      await db.from("settings").upsert({ key: mentorlukAnahtari, value: "1" });
      const tumKatilimcilar = (kisiler ?? []) as {
        id: string;
        full_name: string;
        team: string | null;
        kariyer_seviyesi: string | null;
      }[];
      for (const k of tumKatilimcilar) {
        // Bekleyen görev varsa veya günlük görev kotası dolduysa mentorluk verme
        // (#6: mentorluk da eylem görevidir; "7 görev + mentorluk = 8" taşmasını
        // önler — telefon görev yağmuruna dönmesin).
        // NOT: `durumlar` tik başında kurulur ve BAYATTIR — bu tikte normal/
        // garantili görev alanlar orada görünmez; buTikGorevAlan onları yakalar
        // (eskiden aynı tikte normal + mentorluk üst üste binebiliyordu).
        if (buTikGorevAlan.has(k.id)) continue;
        const d = durumlar.get(k.id);
        if (d?.bekleyen || (d?.bugunSayisi ?? 0) >= gunlukUst) continue;
        const gorev = await mentorlukGorevUret(db, k, gun, tumKatilimcilar);
        if (!gorev) continue;
        const dueAt = new Date(simdi.getTime() + gorev.sure_saat * 3_600_000);
        const { data: yeniMentor } = await db
          .from("missions")
          .insert({
            participant_id: k.id,
            kind: gorev.kind,
            title: gorev.title,
            body: gorev.body,
            trait_id: gorev.trait_id,
            due_at: dueAt.toISOString(),
            difficulty: gorev.difficulty,
            neden: gorev.neden,
            micro_sprint: gorev.micro_sprint,
          })
          .select("id")
          .single();
        // #9 takip: önerilen adayları kayda bağla
        await db.from("mentorluk_kayit").insert({
          mentee_id: k.id,
          mission_id: yeniMentor?.id ?? null,
          aday_idler: gorev.adayIdler,
          gun,
        });
        await katilimciyaBildir(
          db,
          k.id,
          "🤝 AYNA'dan bugünkü mentorluk görevi",
          gorev.body.replace(/\*\*/g, "").slice(0, 120),
          "/"
        );
        ozet.uretilen++;
      }
    }
  }

  // 6a-ter) KANIT GARANTİSİ — Gün 2 akşamı (21:00) sigortası. Kanıtsız kişileri
  // tespit edip akranlarına "onu gözle, güçlü yanını yaz" mikro görevi verir;
  // tamamlanınca yanıt hedefe anonim takdir olur → Boşluk Anı içi boş kalmaz.
  // Varsayılan KAPALI (kanit_garantisi_acik); tek-sefer kilitli (gün başına bir).
  if (mod === "kamp" && gun === 2 && saat === 21 && !sahneSessiz) {
    const { data: bayrak } = await db
      .from("settings")
      .select("value")
      .eq("key", "kanit_garantisi_acik")
      .maybeSingle();
    if (bayrak?.value === "true") {
      const kilitAnahtari = `kanit_garantisi_${bugun}`;
      const { data: yapildi } = await db
        .from("settings")
        .select("key")
        .eq("key", kilitAnahtari)
        .maybeSingle();
      if (!yapildi) {
        await db.from("settings").upsert({ key: kilitAnahtari, value: "1" });
        try {
          const sonuc = await kanitGarantisiDagit(db, simdi);
          ozet.uretilen += sonuc.uretilen;
        } catch {
          // sigorta düşse bile tik akışını bozma
        }
      }
    }
  }

  // 6a-quat) ÜÇLÜ MİNİ-KONSEY (FAZ 3.4) — kişinin gerçek gündemi (kör nokta)
  // üzerinden 3 kişilik buluşma: A dert sahibi, B o konuda dış puanı en yüksek
  // (Johari gizli gücü), C tamamlayıcı persona (karsilasma.ts). Varsayılan
  // KAPALI; kişi başı kamp boyunca bir kez (mini_konsey_<id> kilidi).
  if (mod === "kamp" && gun === 2 && saat === 11 && !sahneSessiz && wowAcikMi.get("mini_konsey_acik")) {
    let verilenSayisi = 0;
    for (const k of kisiler ?? []) {
      if (verilenSayisi >= 3) break; // tik başına flood koruması
      const kilitAnahtari = `mini_konsey_${k.id}`;
      const { data: yapildi } = await db.from("settings").select("key").eq("key", kilitAnahtari).maybeSingle();
      if (yapildi) continue;
      const johari = await johariCaprazGorevUret(db, k, simdi);
      if (!johari) continue;
      const tercih = await karsilasmaBul(db, k.id);
      if (!tercih || tercih.partnerId === johari.hedefId) continue; // C, B'den farklı olmalı
      const [{ data: bKisi }, { data: traitAdData }] = await Promise.all([
        db.from("participants").select("full_name").eq("id", johari.hedefId).maybeSingle(),
        db.from("traits").select("name").eq("id", johari.traitId).maybeSingle(),
      ]);
      if (!bKisi || !traitAdData) continue;
      await db.from("settings").upsert({ key: kilitAnahtari, value: "1" });
      const baglantiId = crypto.randomUUID();
      const metinler = miniKonseyMetinleri(
        k.full_name.split(" ")[0],
        bKisi.full_name.split(" ")[0],
        tercih.partnerAd.split(" ")[0],
        traitAdData.name
      );
      const konseyDueAt = new Date(simdi.getTime() + 3 * 3_600_000);
      const satirlar = [
        { participantId: k.id, body: metinler.aBody },
        { participantId: johari.hedefId, body: metinler.bBody },
        { participantId: tercih.partnerId, body: metinler.cBody },
      ];
      for (const s of satirlar) {
        const { data: yeni } = await db
          .from("missions")
          .insert({
            participant_id: s.participantId,
            kind: "bag",
            title: "Üçlü Konsey",
            body: s.body,
            difficulty: 2,
            baglanti_id: baglantiId,
            issued_at: simdi.toISOString(),
            due_at: konseyDueAt.toISOString(),
          })
          .select("id")
          .single();
        if (yeni) {
          ozet.uretilen++;
          await katilimciyaBildir(
            db,
            s.participantId,
            "🤝 AYNA'dan özel bir davet",
            "Üçlü Konsey seni bekliyor.",
            "/gorevler"
          );
        }
      }
      verilenSayisi++;
    }
  }

  // 6a-penta) KAMP ZİNCİRİ (FAZ 3.5) — sabah tek kişiye ilk halka düşer;
  // zincir tamamlanınca (bkz. /api/gorev-yanit) otomatik bir sonraki halkaya
  // geçer. Varsayılan KAPALI; günde bir kez başlatılır (kilit).
  if (mod === "kamp" && saat === 9 && !sahneSessiz && wowAcikMi.get("kamp_zinciri_acik")) {
    const kilitAnahtari = `kamp_zinciri_baslat_${bugun}`;
    const { data: yapildi } = await db.from("settings").select("key").eq("key", kilitAnahtari).maybeSingle();
    if (!yapildi && (kisiler ?? []).length >= 2) {
      await db.from("settings").upsert({ key: kilitAnahtari, value: "1" });
      const roster = kisiler ?? [];
      const rastgeleKaynak = roster[Math.floor(Math.random() * roster.length)];
      const adaylar: EslesmeAday[] = roster
        .filter((p) => p.id !== rastgeleKaynak.id)
        .map((p) => ({ id: p.id, full_name: p.full_name, team: p.team }));
      const baslangic = await zincirBaslat(db, rastgeleKaynak, adaylar, simdi);
      if (baslangic) {
        const zincirDueAt = new Date(simdi.getTime() + 3 * 3_600_000);
        const { data: yeni } = await db
          .from("missions")
          .insert({
            participant_id: rastgeleKaynak.id,
            kind: "bag",
            title: baslangic.title,
            body: baslangic.body,
            difficulty: 2,
            zincir_id: baslangic.zincirId,
            zincir_sira: 1,
            issued_at: simdi.toISOString(),
            due_at: zincirDueAt.toISOString(),
          })
          .select("id")
          .single();
        if (yeni) {
          await eslesmeKaydet(db, yeni.id, rastgeleKaynak.id, baslangic.hedef.id, true);
          ozet.uretilen++;
          await katilimciyaBildir(
            db,
            rastgeleKaynak.id,
            "🔗 Zincirin ilk halkasısın",
            baslangic.body.slice(0, 120),
            "/gorevler"
          );
        }
      }
    }
  }

  // 6a-hexa) TAHMİN-GERÇEK SAPMASI (FAZ 4.3) — Gün 2'de, kişinin tahmin
  // görevi yanıtı biriken gerçek dış puan profiliyle belirgin çelişiyorsa
  // merak uyandıran bir görev üretilir. Varsayılan KAPALI; kişi başı bir kez.
  if (mod === "kamp" && gun === 2 && saat === 16 && !sahneSessiz && wowAcikMi.get("tahmin_sapmasi_acik")) {
    let verilenSayisi = 0;
    for (const k of kisiler ?? []) {
      if (verilenSayisi >= 3) break;
      const kilitAnahtari = `tahmin_sapmasi_${k.id}`;
      const { data: yapildi } = await db.from("settings").select("key").eq("key", kilitAnahtari).maybeSingle();
      if (yapildi) continue;
      const sapma = await tahminSapmasiGorevUret(db, k);
      await db.from("settings").upsert({ key: kilitAnahtari, value: "1" });
      if (!sapma) continue;
      const dueAt = new Date(simdi.getTime() + 3 * 3_600_000);
      const { data: yeni } = await db
        .from("missions")
        .insert({
          participant_id: k.id,
          kind: "tahmin",
          title: sapma.title,
          body: sapma.body,
          difficulty: 2,
          issued_at: simdi.toISOString(),
          due_at: dueAt.toISOString(),
        })
        .select("id")
        .single();
      if (yeni) {
        ozet.uretilen++;
        await katilimciyaBildir(db, k.id, "🔮 AYNA'dan yeni görev", sapma.body.slice(0, 120), "/gorevler");
        verilenSayisi++;
      }
    }
  }

  // 6a-hepta) SENKRONİZE KÜME GÖREVİ (FAZ 5.3) — aynı anda birden çok kişiye
  // düşen ÖZDEŞ mikro görev; ortak baglanti_id ile gruplanır. Görev metni "şu
  // an N kişiye daha düştü, kimler olduğunu teslimde göreceksin" der; teslimde
  // /api/gorev-yanit küme reveal'i mini-duvarı gösterir. Varsayılan KAPALI;
  // günde bir kez, boşta 3-6 kişilik bir kümeye.
  if (mod === "kamp" && !sahneSessiz && wowAcikMi.get("kume_gorev_acik")) {
    const kilitAnahtari = `kume_gorev_${bugun}`;
    const { data: yapildi } = await db.from("settings").select("key").eq("key", kilitAnahtari).maybeSingle();
    if (!yapildi) {
      // Boşta (bekleyen görevi olmayan) kişiler.
      const bostakiler = (kisiler ?? []).filter((k) => !durumlar.get(k.id)?.bekleyen);
      if (bostakiler.length >= 3) {
        await db.from("settings").upsert({ key: kilitAnahtari, value: "1" });
        const kume = bostakiler.slice(0, Math.min(6, bostakiler.length));
        const baglantiId = crypto.randomUUID();
        const kumeDueAt = new Date(simdi.getTime() + 60 * 60_000);
        const govde = `Bu görev şu anda ${kume.length} kişiye birden düştü. Hepiniz aynı şeyi yapıyorsunuz: durduğun yerde derin bir nefes al ve bugün minnettar olduğun tek şeyi bana yaz. Kimlerle birlikte yaptığını teslimde göreceksin.`;
        for (const k of kume) {
          const { data: yeni } = await db
            .from("missions")
            .insert({
              participant_id: k.id,
              kind: "senkron",
              title: "Aynı anda, birlikte",
              body: govde,
              difficulty: 1,
              baglanti_id: baglantiId,
              issued_at: simdi.toISOString(),
              due_at: kumeDueAt.toISOString(),
            })
            .select("id")
            .single();
          if (yeni) {
            ozet.uretilen++;
            await katilimciyaBildir(db, k.id, "⏱ Senkron küme görevi", "Şu anda birkaç kişiyle aynı şeyi yapıyorsun.", "/gorevler");
          }
        }
      }
    }
  }

  // 6) Günlük fısıltı (13-14 ve 20-21 aralığında birer kez): "bugün N göz seni puanladı"
  if ((saat === 13 || saat === 20) && !sahneSessiz) {
    const dilim = saat === 13 ? "ogle" : "aksam";
    const anahtar = `fisilti_${bugun}_${dilim}`;
    const { data: gonderilmis } = await db
      .from("settings")
      .select("key")
      .eq("key", anahtar)
      .maybeSingle();
    if (!gonderilmis) {
      await db.from("settings").upsert({ key: anahtar, value: "1" });
      const gunBasiUtc = new Date(`${bugun}T00:00:00+03:00`).toISOString();
      const { data: bugunPuanlar } = await db
        .from("ratings")
        .select("target_id, is_self")
        .gte("created_at", gunBasiUtc);
      const sayilar = new Map<string, number>();
      for (const p of bugunPuanlar ?? []) {
        if (p.is_self) continue;
        sayilar.set(p.target_id, (sayilar.get(p.target_id) ?? 0) + 1);
      }
      for (const [pid, n] of sayilar) {
        if (n < 1) continue;
        await katilimciyaBildir(
          db,
          pid,
          "👁 AYNA'nın fısıltısı",
          `Bugün ${n} değerlendirme aldın. Kim, kaç verdi? Gün 3'te aynanda. Sen sen ol, gözlemlemeye devam et.`,
          "/degerlendir"
        );
        ozet.fisilti++;
      }
    }
  }

  // 6b) GECE YANSIMASI ÜRETİMİ: kendi sesinden gece mesajı, akşam erken
  // saatten itibaren sessizce hazırlanır (üretim push değildir — sahneyi
  // bozmaz). night_date tekrarları engeller; tik başına ≤8 üretim.
  if (kampGunuBugun && GECE_FISILTILARI[kampGunuBugun] && saat >= 21) {
    const { data: geceBekleyen } = await db
      .from("voice_profiles")
      .select("participant_id")
      .eq("status", "klonlandi")
      .or(`night_date.is.null,night_date.neq.${bugun}`)
      .limit(8);
    if ((geceBekleyen ?? []).length > 0) {
      const adlar = new Map((kisiler ?? []).map((k) => [k.id, k.full_name]));
      for (const g of geceBekleyen ?? []) {
        const ad = adlar.get(g.participant_id);
        const metin = ad
          ? geceYansimaMetni(kampGunuBugun, ad.split(" ")[0])
          : null;
        if (!metin) continue;
        await geceSesi(db, g.participant_id, metin, bugun);
      }
    }
  }

  // 7) GECE FISILTISI: sahne kapanınca (23:40+) günün tek kapanış push'u —
  // Gün 1 ve 2'de, settings kilidiyle günde bir kez. Ana sayfadaki Konuşan
  // Yansıma kartına çağırır; sonra sessizlik (00:00).
  if (
    kampGunuBugun &&
    GECE_FISILTILARI[kampGunuBugun] &&
    saat === 23 &&
    dakika >= 40
  ) {
    const geceAnahtari = `gece_${bugun}`;
    const { error: geceKilit } = await db
      .from("settings")
      .insert({ key: geceAnahtari, value: "1" });
    if (!geceKilit) {
      await herkeseBildir(db, "🌙 AYNA", GECE_FISILTILARI[kampGunuBugun], "/");
      ozet.fisilti++;
    }
  }

  // FAZ B — Söz takibi eskalasyonu: adımını kaçıranları dürt, 4+ günde şahitleri
  // uyar. Sessiz saat kontrolü yukarıda geçildi (buraya gelindiyse push uygun).
  // Kendi throttle'ı var; her tikte güvenle çağrılır.
  try {
    const esk = await eskalasyonTara(db);
    ozet.durtulen += esk.kisi + esk.tanik;
  } catch {}

  return { ozet: "tamam", ...ozet };
}
