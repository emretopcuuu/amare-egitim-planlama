import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import { tumKayitlar } from "@/lib/tumKayitlar";
import { eskalasyonTara, sahitOzetiGonder, checkinCipasi, sozKarnesiGonder, sahitDavetHatirlat, sessizDonusSesi, haftaninSahidi } from "@/lib/sozTakip";
import { ufukToreniTara } from "@/lib/ufukToren";
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
import { sicakAnTaze, sicakAnTemizle } from "@/lib/sicakAn";
import { orkestratoduIsle } from "@/lib/orkestrator";
import { johariCaprazGorevUret } from "@/lib/johariCapraz";
import { gizliEsGorevMetni, tanikGoreviMetni, miniKonseyMetinleri } from "@/lib/eslesmeWow";
import { zincirBaslat } from "@/lib/kampZinciri";
import { tahminSapmasiGorevUret } from "@/lib/tahminSapmasi";
import { karsilasmaBul } from "@/lib/karsilasma";
import { higgsYapilandirildiMi, yansimaDurumu } from "@/lib/higgs";
import { katilimciyaBildir, herkeseBildir, adminlereBildir } from "@/lib/push";
import { radyoTik } from "@/lib/kampRadyosu";
import { kapanisBrifTik } from "@/lib/kapanis";
import { takdirZarfiTik } from "@/lib/takdirZarfi";
import { sessizKahramanTik } from "@/lib/sessizKahraman";
import { seniIzledimAc } from "@/lib/seniIzledim";
import { rekorTara, rekorlarAcikMi } from "@/lib/rekorlar";
import { ciftSerisiDegerlendir, ciftSerisiAcikMi } from "@/lib/ciftSerisi";
import { hamleTaraOlustur, hamleHatirlat, hamleAcikMi } from "@/lib/hamle";
import { kayipBakimTik, kayipAcikMi } from "@/lib/kayipEsya";
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

// Özellik 5 — şahit varyantı zarı: kişi + hedef + gün tohumlu DETERMİNİSTİK %12.
// Math.random yerine tohum: prova/gerçek koşumda aynı eşleşme aynı kararı verir,
// ve hedef değiştikçe zar tazelenir (aynı kişiye gün boyu hep şahit düşmez).
const SAHIT_OLASILIK_YUZDE = 12;
function sahitVaryantiMi(pid: string, hedefId: string, gunTarihi: string): boolean {
  const s = `${pid}|${hedefId}|${gunTarihi}|sahit`;
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % 100 < SAHIT_OLASILIK_YUZDE;
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
    sahitOzeti: 0,
    checkinCipa: 0,
    ufukToren: 0,
    orkestratorAtes: 0,
    takdirZarfi: 0,
    sessizKahraman: 0,
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
      "prova_katilimci_id",
      "ayna_otomatik_uyandir",
    ]);
  const ayar = new Map((ayarlar ?? []).map((a) => [a.key, a.value]));

  if (ayar.get("ayna_aktif") !== "true") {
    // OTOMATİK UYANDIRMA: admin elle "uyandır"a basmasın diye — planlanan saat
    // (ayna_otomatik_uyandir, ISO) geldiyse AYNA kendini aktive eder, gün sayacını
    // başlatır ve adminlere haber verir. Erken açmak için manuel yol yine çalışır;
    // plan değişirse ayar güncellenir/silinir. Yalnız gerçek-zaman tikinde (prova hariç).
    const planIso = ayar.get("ayna_otomatik_uyandir");
    const planMs = planIso ? new Date(planIso).getTime() : NaN;
    if (!provaModu && Number.isFinite(planMs) && simdi.getTime() >= planMs) {
      await db.from("settings").upsert({ key: "ayna_aktif", value: "true", updated_at: simdi.toISOString() });
      ayar.set("ayna_aktif", "true");
      if (!ayar.get("ayna_baslangic")) {
        await db.from("settings").upsert({ key: "ayna_baslangic", value: simdi.toISOString(), updated_at: simdi.toISOString() });
        ayar.set("ayna_baslangic", simdi.toISOString());
      }
      await adminlereBildir(
        db,
        "🌅 AYNA uyandı — kamp başladı",
        "Planladığın saatte otomatik açıldı. Görev motoru ve senaryo devrede.",
        "/admin"
      ).catch(() => {});
    } else {
      return { ozet: "AYNA uyuyor (pasif)", ...ozet };
    }
  }

  // GÜVENLİK KİLİDİ: prova modundaysak tek bir katılımcıyla sınırlıyız —
  // katılımcı seçilmemişse (olması gerekmeyen bir durum, savunma amaçlı) tik'i
  // tamamen durdur. Bu olmadan prova tüm gerçek onboarding'deki kişilere
  // görev/bildirim gönderirdi (bkz. lib/prova.ts provaBaslat — artık zorunlu
  // katilimciId parametresi alıyor).
  const provaKatilimciId = ayar.get("prova_katilimci_id") ?? null;
  if (provaModu && !provaKatilimciId) {
    return { ozet: "Prova: katılımcı seçilmemiş — güvenlik nedeniyle durduruldu", ...ozet };
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
  // NOT: erken dönüş, bekleyen puanlama drenajının (aşağıda) SONRASINDA — böylece
  // kapanış telaşında son dakika yanıt verip anlık puanlaması aksayanların görevi
  // 'submitted'da donup kalmaz; puanları hesaplanır, yalnız YENİ görev üretilmez.
  const uretimDurduruldu = ayar.get("gorev_uretimi_durduruldu") === "true";

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
      sonuc = { puan: 7, yorum: tr.gorevler.kurtarmaYorum, response_tags: [], taahhut: null };
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

  // Kapanış sessizliği: bekleyen puanlama yukarıda boşaltıldı; şimdi YENİ görev
  // üretmeden dur (drenaj kaçırılmasın diye erken dönüş buraya taşındı).
  if (uretimDurduruldu) {
    return { ozet: "Kamp sonrası sessizlik — bekleyen puanlama boşaltıldı, üretim durduruldu", ...ozet };
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

  // GÜVENLİK KİLİDİ (devam): prova'daysak sorgu TEK katılımcıya sabitlenir.
  let kisilerSorgu = db
    .from("participants")
    .select("id, full_name, team, phone, kariyer_seviyesi, kariyer_durumu, yeniden_giris_basamak, sicak_an")
    .eq("role", "participant");
  if (provaModu && provaKatilimciId) kisilerSorgu = kisilerSorgu.eq("id", provaKatilimciId);

  // sonGorevler (son 26 saatin TÜM görevleri) ve yanitGecmisi (son 3 gün) 150
  // kişide 1000-satır PostgREST tavanını aşar; sayfalı çekilmezse kırpılan
  // satırlara ait kişilerin "bekleyen görevi var mı / bugün kaç aldı" durumu
  // yanlış görünür → çift görev / atlanan kişi. tumKayitlar tümünü birleştirir.
  const gorevPencereBasi = new Date(simdi.getTime() - 26 * 3_600_000).toISOString();
  const yanitPencereBasi = new Date(simdi.getTime() - 3 * 86_400_000).toISOString();
  const [{ data: kisiler }, sonGorevler, yanitGecmisi] = await Promise.all([
    kisilerSorgu,
    tumKayitlar<{ participant_id: string; status: string; issued_at: string; kind: string | null }>(
      (bas, son) =>
        db
          .from("missions")
          .select("participant_id, status, issued_at, kind")
          .gte("issued_at", gorevPencereBasi)
          .order("id")
          .range(bas, son)
    ),
    // #2 Pik yanıt saati için son 3 günlük yanıt geçmişi (responded_at).
    tumKayitlar<{ participant_id: string; responded_at: string | null }>((bas, son) =>
      db
        .from("missions")
        .select("participant_id, responded_at")
        .not("responded_at", "is", null)
        .gte("responded_at", yanitPencereBasi)
        .order("id")
        .range(bas, son)
    ),
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
  // Özellik 3 — SICAK AN: taze (<45 dk) duygu sinyali olan kişi öncelik alır ve
  // görev aralığı/pik-saat kısıtlarını atlar (günlük kota, bekleyen-görev-yok,
  // sessiz saat/sahne sessizliği/David oturumu kapıları GEÇERLİ kalır).
  const sicakMi = (k: { sicak_an?: unknown }) => sicakAnTaze(k.sicak_an, simdi) !== null;
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
      // Özellik 3 — duygu sıcakken (~15 dk hedefi) aralık/pik bekletmez.
      if (sicakMi(k)) return true;
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
    // Özellik 3 — sıcak an sahibi sırayı deler: an soğumadan (slice 3'e takılmadan) yakala.
    .sort((a, b) => {
      const sa = sicakMi(a);
      const sb = sicakMi(b);
      if (sa !== sb) return sa ? -1 : 1;
      const da = durumlar.get(a.id);
      const db = durumlar.get(b.id);
      const fark = (da?.bugunSayisi ?? 0) - (db?.bugunSayisi ?? 0);
      if (fark !== 0) return fark;
      return (da?.sonVerilis ?? 0) - (db?.sonVerilis ?? 0);
    })
    // Tik başına AI görev üretim tavanı. #4 (150 kişi ölçeği): görev üretimi
    // artık SIRALI değil, ES_ZAMAN'lık kümelerle PARALEL (aşağıdaki chunk
    // döngüsü). Her görev ~2 AI çağrısı (~3-6s) sürer; sıralıyken tavan 5'ti
    // (bir etkinlik bitince 30-40 kişi aynı anda uygun olunca 6-8 tik = ~35 dk
    // kuyruk). Paralel: ~24 kişi/tik, 4 küme × ~6s ≈ 24s (60s içinde). Kişi
    // başına görev sayısı/kalitesi DEĞİŞMEZ — yalnız duvar-saati düşer, patlama
    // gecikmesi ~35 dk → ~1-2 tik. NOT: prova/yük testinde tik süresini ölç;
    // 24'te 60s'yi zorlarsa tavanı ya da ES_ZAMAN'ı düşür. Prova: 40 (hızlı zaman).
    .slice(0, provaModu ? 40 : mod === "kamp" ? 24 : 3);
  // #4 eşzamanlılık tavanı: bir kümede kaç görev paralel üretilir. Düşük
  // tutuluyor çünkü eslesmeHedefiSec dengeleyicisi DB'den "bu kişiye kaç kez
  // eşleşildi"yi okur; çok yüksek eşzamanlılıkta iki üretim aynı hedefi kapıp
  // hafif dengesizlik yapabilir. 6, patlamayı erittiği hâlde bu yarışı küçük tutar.
  const ES_ZAMAN = 6;

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

  // #4 — tek kişiye görev dağıtım gövdesi. Eski `for (const k of uygunlar)`
  // döngüsü aynen buraya taşındı; `continue` → `return` oldu. Aşağıda
  // ES_ZAMAN'lık kümelerle Promise.all üzerinden PARALEL çağrılır. Kapatıcılar
  // (ozet, altinBugunKalan) JS tek-iş-parçacıklı olduğu için await'ler arası
  // atomiktir; altın kotası await'ten ÖNCE eşzamanlı düşülür (aşağıya bkz).
  const kisiyeGorevDagit = async (k: (typeof uygunlar)[number]) => {
    // Özellik 3 — sıcak an: tazeyse görev üretimine bağlam olur; soğumuşsa
    // (45 dk+) tüketilmeden temizlenir (bayat duyguya görev kurulmaz).
    const kSicakHam = (k as { sicak_an?: unknown }).sicak_an;
    const kSicak = sicakAnTaze(kSicakHam, simdi);
    if (kSicakHam && !kSicak) await sicakAnTemizle(db, k.id);
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
    // #7 oyun→şahit: Gün 2'de bir fiziksel oyun (bowling/atv/bubble/hazine) az
    // önce bittiyse, isimli bağı ZORLA oyun-rolü şahit gözlemine çevir.
    let kOyunBitti = false;
    // #4 David yakalama: Gün 2'de David (CEO) oturumu az önce (≤30 dk) bittiyse,
    // görevi "ne sordun, ne aldın?" yakalama görevine çevir (tek sefer).
    let kDavidBitti = false;
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
        if (grupAzOnceFiziksel(grupNo, gunDk)) {
          kYorgun = true;
          kOyunBitti = true;
        }
        // David oturumu ≤30 dk önce bittiyse yakalama penceresi açık.
        if (grupBitenBlok(grupNo, gunDk, 30)?.tur === "david_toplanti") kDavidBitti = true;
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
      return; // yeniden giriş: bu tik AI görevi üretme, çek sun
    }

    // Sıradaki köprüsünü yalnız kişi ŞU AN bir etkinliğin içinde DEĞİLken kur
    // (etkinlikteyse görev zaten ona bağlanıyor; çift bağlam karıştırır).
    const gorev = await gorevUret(
      db, k, gun, saat, mod, kEtkinlik, kBiten, kIpucu, kEtkinlik ? null : kSiradaki, kYorgun,
      kMekanFarkindaAdaylar,
      // Faz 3 — bahisIzin: yalnız tik dağıtımı bahis bayrağını yazdığı için
      // bahis çerçevesi de yalnız burada üretilebilir (metin/bayrak tutarlı).
      { sonKacirmaSebebi: sonKacirma?.kacirma_sebebi ?? null, girisBasamak, bahisIzin: true },
      kSicak // Özellik 3 — sıcak an bağlamı (mikro-görev + duyguya dokunuş)
    );
    if (!gorev) return;
    // Özellik 3 — sıcak an bu üretimde tüketildi: hangi insert dalına girilirse
    // girilsin an bir kez kullanılır; önbelleği hemen temizle.
    if (kSicak) await sicakAnTemizle(db, k.id);

    // FAZ 3.2 — JOHARI ÇAPRAZ EŞLEŞTİRME: kota "bag" seçtiyse ve bayrak açıksa,
    // AI'lı görevin yerine deterministik/statik Johari görevini kullan (ucuz,
    // kör noktayı asla yüzüne vurmaz — yalnız hedefin gücünden söz eder).
    let johariOverride: Awaited<ReturnType<typeof johariCaprazGorevUret>> = null;
    if (gorev.kind === "bag" && wowAcikMi.get("johari_capraz_acik")) {
      johariOverride = await johariCaprazGorevUret(db, k, simdi);
    }

    // Özellik 5 — ŞAHİT PERSPEKTİFİ: isimli bir bağ eşleşmesi çıktıysa,
    // kişi+hedef+gün tohumlu deterministik %12 ile görev şahit varyantına
    // dönüşür: "10 dk [Ad]'ı gözle; onda gördüğün, muhtemelen kendisinin
    // görmediği BİR gücü yaz." Yanıt sahit_gozlemleri'ne yazılır (gorev-yanit)
    // ve hedefin SONRAKİ görevinin açılış cümlesi olur (gorevUret). Statik
    // şablon (AI'sız, tr.ts); eşleşme kaydı normal bağ gibi işler.
    let sahitOverride: { title: string; body: string } | null = null;
    if (
      gorev.kind === "bag" &&
      gorev.eslesme?.isimli &&
      !johariOverride &&
      // #7: oyun az önce bittiyse ZORLA şahit (rasgele %12'yi bekleme); değilse
      // normal deterministik %12 şahit varyantı.
      (kOyunBitti || sahitVaryantiMi(k.id, gorev.eslesme.hedefId, bugun))
    ) {
      const sahitHedef = (kisiler ?? []).find((p) => p.id === gorev.eslesme!.hedefId);
      if (sahitHedef) {
        sahitOverride =
          kOyunBitti && kBiten?.baslik
            ? {
                // #7 Oyun-rolü gözlemi: gözleyenin yanıtı sahit_gozlemleri'ne yazılır
                // → gözlenenin sonraki görevi "biri sende şunu gördü" ile açılır.
                title: tr.gorevler.sahitOyunBaslik,
                body: tr.gorevler.sahitOyunGovde(sahitHedef.full_name, kBiten.baslik),
              }
            : {
                title: tr.gorevler.sahitGorevBaslik,
                body: tr.gorevler.sahitGorevGovde(sahitHedef.full_name),
              };
      }
    }

    // #4 DAVID YAKALAMA (öncelikli, kendine-görev): David oturumu ≤30 dk önce
    // bittiyse ve kişi daha önce yakalamadıysa, görevi "ne sordun, ne aldın?"
    // yakalama görevine çevir. Yanıt david_yakalama=true ile işaretlenir →
    // sonraki görevlere/rapora akar (davidNotuGetir).
    let davidOverride: { title: string; body: string } | null = null;
    if (kDavidBitti && !johariOverride && !sahitOverride) {
      const { data: oncekiDavid } = await db
        .from("missions")
        .select("id")
        .eq("participant_id", k.id)
        .eq("david_yakalama", true)
        .limit(1)
        .maybeSingle();
      if (!oncekiDavid) {
        davidOverride = {
          title: tr.gorevler.davidYakalamaBaslik,
          body: tr.gorevler.davidYakalamaGovde,
        };
      }
    }

    // FAZ 5.4 — İKİ KAPI: ara sıra (bayrak açık + %15) tek görev yerine bir
    // SEÇİM sun — Kapı A = üretilen görev (doğal türü), Kapı B = karşıt lezzette
    // statik bir görev (cesaret↔bağ). İkisi de status="secim_bekliyor" +
    // ortak secim_grubu; kişi birini seçince öteki 'expired' olur (bkz.
    // /api/kapi-sec). secim_bekliyor bir aktif/bekleyen görev SAYILMAZ.
    // Şahit varyantı seçilmişse kapıya çevrilmez (gözlem anı seçime kurban gitmesin).
    if (
      wowAcikMi.get("iki_kapi_acik") &&
      !johariOverride &&
      !sahitOverride &&
      !gorev.bahis && // Faz 3 — bahis görevi seçim kapısına dönüşmez
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
      return; // normal görev insert'ini atla
    }

    // FAZ 5.2 — ALTIN GÖREV: bu görev nadir "altın" varyantı mı? Gün kotası
    // (altinBugunKalan) doluysa ve %25 şansla. (gorevUret yalnız normal görev
    // türleri üretir — senkron/soz/mentorluk zaten ayrı akışlardan gelir.)
    // Şahit varyantı altınlaşmaz (sessiz gözlem görevi sahne ışığı istemez).
    const altinMi = altinBugunKalan > 0 && !sahitOverride && Math.random() < 0.25;
    // #4 paralel güvenlik: altın kotasını KARAR ANINDA (await'ten önce) düş —
    // aksi halde aynı kümedeki iki üretim kotayı beraber görüp aşabilir.
    if (altinMi) altinBugunKalan--;

    // Özellik 5 — override zinciri: johari ve şahit birbirini dışlar (yukarıda
    // şahit yalnız !johariOverride iken kurulur). Statik şablonlar AI görevinin
    // kişisel alanlarını (neden/fayda/somutluk/kas...) taşımaz.
    const nihaiTitle = davidOverride?.title ?? johariOverride?.title ?? sahitOverride?.title ?? gorev.title;
    const nihaiBody = davidOverride?.body ?? johariOverride?.body ?? sahitOverride?.body ?? gorev.body;
    // #4 David yakalama + #7 şahit: statik override → AI görevinin kişisel
    // alanları (neden/fayda/somutluk/kas) taşınmaz.
    const statikOverride = !!davidOverride || !!sahitOverride;

    // #8 micro_sprint: sure_saat 0.5 = 30 dk. Şahit görevi sabit 3 saatlik
    // (Gün 1'de 2 saatle %42 kaçırma — türlerin en yükseği).
    const dueAt = new Date(
      simdi.getTime() + (statikOverride ? 3 : gorev.sure_saat) * 3_600_000
    );
    const { data: yeniGorev, error } = await db
      .from("missions")
      .insert({
        participant_id: k.id,
        trait_id: johariOverride ? johariOverride.traitId : statikOverride ? null : gorev.trait_id,
        kind: davidOverride ? "yansima" : sahitOverride ? "sahit" : gorev.kind,
        david_yakalama: !!davidOverride, // #4 rapor/görev köprüsü işareti
        title: nihaiTitle,
        body: nihaiBody,
        difficulty: statikOverride ? 1 : gorev.difficulty,
        neden: statikOverride ? null : gorev.neden,
        fayda: statikOverride ? null : gorev.fayda,
        ipuclari: statikOverride ? [] : gorev.ipuclari,
        micro_sprint: statikOverride ? false : gorev.micro_sprint,
        yay_gorevi: statikOverride ? false : gorev.yayGorevi,
        donus_bicimi: statikOverride ? "yaz" : gorev.donusBicimi, // #7 çeşitlilik izlemesi
        somutluk: statikOverride ? null : gorev.somutluk, // FAZ 1.1 — kim/ne/nerede/ne_zaman/kanit checklist
        altin: altinMi, // FAZ 5.2 — nadir altın görev (3x kıvılcım)
        // Faz 3 — bahis: johari/şahit override AI metnini değiştirir → bahis düşer.
        bahis: johariOverride || sahitOverride ? false : gorev.bahis,
        // Özellik 7 — zorluk merdiveni ölçümü: görevin kası + modelin doz ölçümü.
        // Johari/şahit override AI görevinin yerine geçer — o zaman kas izi yazılmaz.
        kas: johariOverride || sahitOverride ? null : gorev.kas,
        zorluk_seviye: johariOverride || sahitOverride ? null : gorev.zorlukSeviye,
        // Özellik 2 — bu görev hangi kimlik cümlesini çürütmek için kurgulandı
        // (statik override'larda direktif prompta girmedi → iz yazılmaz).
        kimlik_cumle_id: johariOverride || sahitOverride ? null : gorev.kimlikCumleId,
        // KRİTİK: issued_at motorun kullandığı saate (prova'da SANAL saat) eşit
        // olmalı. Aksi halde sonGorevler penceresi + bugunSayisi + sonVerilis +
        // bekleyen kontrolleri kayıyor ve prova'da her tik görev üretip sel oluyor.
        // Gerçek kampta simdi = gerçek now → değişiklik yok.
        issued_at: simdi.toISOString(),
        due_at: dueAt.toISOString(),
      })
      .select("id")
      .single();
    if (error || !yeniGorev) return;
    // FAZ 5.2 — altın görev düştüyse: kotayı düş + HERKESE heyecan push'u
    // (kimde olduğu değil — yalnız "az önce birine düştü"). METİN KURALI:
    // "sıradaki sende" gibi kişiye özel bir vaat KURMA — bu broadcast'i alan
    // kişinin şu an görevi olmayabilir; tıklayınca boş ekran gelirse "yalan
    // söyledi" hissi yaratıyordu (saha geri bildirimi). Yalnız FOMO/sosyal
    // kanıt ver, kendi görevine bak daveti yap — kesinlik iması yok.
    if (altinMi) {
      await herkeseBildir(
        db,
        "⚡ Kampta bir altın görev çıktı",
        "Nadir bir altın görev birine düştü. Kendi görevlerine bir göz at.",
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
    // Şahit varyantında KURULMAZ: gözlenen kişiye o an görev düşerse doğal
    // hâli bozulur — şahit tam da kendiliğinden davranışı yakalamalı.
    if (eslesmeIsimliMi && eslesmeHedefId && !sahitOverride && wowAcikMi.get("cift_gizli_gorev_acik")) {
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
      `🤖 AYNA'dan yeni görev: ${nihaiTitle}`,
      nihaiBody.length > 120 ? nihaiBody.slice(0, 117) + "…" : nihaiBody,
      "/gorevler" // A3: bildirimden doğrudan görev ekranına
    );
    // Ses katmanı: simülasyonda İTİRAZCI konuşur (stok ses, herkese);
    // gizli/cesarette YANSIMAN fısıldar (klon, bütçeli). Şahit override'ı
    // yalnız "bag" türünden doğar — bu dallara zaten girmez.
    if (gorev.kind === "simulasyon" && gorev.itiraz) {
      await itirazSesi(db, k.id, yeniGorev.id, gorev.itiraz);
    } else if (!sahitOverride && (gorev.kind === "gizli" || gorev.kind === "cesaret")) {
      await gorevSeslendir(db, k.id, yeniGorev.id, gorev.title, gorev.body);
    }
  };

  // #4 — kümelenmiş paralel dağıtım: ES_ZAMAN kadar kişiye görev aynı anda
  // üretilir, küme bitince sıradaki küme. Duvar-saati sum-of-sequential yerine
  // ~(N/ES_ZAMAN)×per-task olur; 60s tik penceresine daha çok kişi sığar.
  for (let i = 0; i < uygunlar.length; i += ES_ZAMAN) {
    await Promise.all(uygunlar.slice(i, i + ES_ZAMAN).map(kisiyeGorevDagit));
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

  // [FAZ 8 · Madde 8] UFUK GEÇİŞ TÖRENİ: yolculuk modunda sabah 09:00-09:09'da,
  // günde bir kez (settings kilidi), aktif plan ufku değişen kişilere kutlama push'u.
  if (mod === "yolculuk" && saat === 9 && dakika < 10) {
    const { error: ufukKilit } = await db
      .from("settings")
      .insert({ key: `ufuk_toren_kontrol_${bugun}`, value: "1" });
    if (!ufukKilit) {
      const sonuc = await ufukToreniTara(db);
      ozet.ufukToren = sonuc.gonderilen;
    }
  }

  // [FAZ 7 · Madde 10] AKŞAM ÇEKİN ÇIPASI: yolculuk modunda 20:30'dan sonra,
  // günde bir kez, mühürlü sözü olan ama BUGÜN henüz işaretlememiş herkese nazik
  // "bugünü işaretle" push'u — ceza motorundan (eskalasyon) önce gelen tek pozitif
  // günlük hatırlatma. settings kilidiyle bir kez.
  if (mod === "yolculuk" && saat === 20 && dakika >= 30) {
    const { error: cipaKilit } = await db
      .from("settings")
      .insert({ key: `checkin_cipa_${bugun}`, value: "1" });
    if (!cipaKilit) {
      const sonuc = await checkinCipasi(db);
      ozet.checkinCipa = sonuc.gonderilen;
    }
  }

  // [Şahitlik geliştirme #8] PAZARTESİ ŞAHİT ÖZETİ: yolculuk modunda Pazartesi
  // 08:00-08:09'da (ortak check-in'den önce, çakışmasın) her şahide takip
  // ettiği kişilerin haftalık özetini gönderir (settings kilidiyle bir kez).
  if (mod === "yolculuk") {
    const pazartesiMiOzet =
      new Intl.DateTimeFormat("en-US", {
        timeZone: "Europe/Istanbul",
        weekday: "short",
      }).format(simdi) === "Mon";
    if (pazartesiMiOzet && saat === 8 && dakika < 10) {
      const { error: ozetKilit } = await db
        .from("settings")
        .insert({ key: `sahit_ozeti_${bugun}`, value: "1" });
      if (!ozetKilit) {
        const sonuc = await sahitOzetiGonder(db);
        ozet.sahitOzeti = sonuc.gonderilen;
      }
      // KAPANIŞ Faz D · öneri 10 — SÖZ KARNESİ: aynı Pazartesi penceresinde
      // Emre'ye (adminlere) haftalık söz-tutma raporu (kendi settings kilidi).
      const { error: karneKilit } = await db
        .from("settings")
        .insert({ key: `soz_karnesi_${bugun}`, value: "1" });
      if (!karneKilit) await sozKarnesiGonder(db).catch(() => {});
      // [B#17] HAFTANIN ŞAHİDİ: geçen haftanın en aktif şahidine tanınma push'u.
      const { error: sahidiKilit } = await db
        .from("settings")
        .insert({ key: `haftanin_sahidi_${bugun}`, value: "1" });
      if (!sahidiKilit) {
        try {
          const s = await haftaninSahidi(db);
          if (s) {
            await katilimciyaBildir(
              db,
              s.witnessId,
              "🏅 Haftanın Şahidi sensin",
              `Geçen hafta şahitlerine en çok sen dokundun (${s.sayi} kez). Sözünü tuttukları kadar, sen de onları tuttun. Teşekkürler.`,
              "/sahitlik"
            ).catch(() => {});
          }
        } catch {
          // sessizce geç
        }
      }
    }
  }

  // [E#41] SESSİZLEŞENE AYNA'NIN SESİ: yolculuk modunda Çarşamba 12:00-12:09'da
  // (haftalık kilit) 7+ gün sessiz kalanlara markanın sesinden sıcak dönüş daveti.
  // Kişi başına 6 gün throttle + CAP fonksiyon içinde; TTS yoksa/karakter kapalıysa atlar.
  if (mod === "yolculuk" && saat === 12 && dakika < 10) {
    const carsambaMi =
      new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Istanbul", weekday: "short" }).format(simdi) === "Wed";
    if (carsambaMi) {
      const { error: sesKilit } = await db
        .from("settings")
        .insert({ key: `sessiz_ses_tarama_${bugun}`, value: "1" });
      if (!sesKilit) await sessizDonusSesi(db).catch(() => {});
    }
  }

  // [B#11] ŞAHİT DAVET HATIRLATICISI: yolculuk modunda her gün 11:00-11:09'da
  // (günlük settings kilidiyle bir kez) bekleyen davetleri tarar — 2 gün yanıtsız
  // davet şahide, 5 gün yanıtsız sahibe hatırlatılır. Diğer pencerelerle çakışmaz.
  if (mod === "yolculuk" && saat === 11 && dakika < 10) {
    const { error: davetKilit } = await db
      .from("settings")
      .insert({ key: `sahit_davet_hatirlat_${bugun}`, value: "1" });
    if (!davetKilit) await sahitDavetHatirlat(db).catch(() => {});
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

  // 3f-2) P10 PAZAR KARNESİ: yolculuk modunda Pazar 18:00'de herkese "karneni ver"
  // dürtüsü (settings kilidiyle haftada bir). Karne /karne'de 3 sayı → kamp
  // arkadaşına tanıklık raporu. Kendi hatasını yutar.
  if (mod === "yolculuk") {
    const pazarMi =
      new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Istanbul", weekday: "short" }).format(simdi) === "Sun";
    if (pazarMi && saat === 18 && dakika < 10) {
      const { error: karneKilit } = await db
        .from("settings")
        .insert({ key: `pazar_karnesi_durtu_${bugun}`, value: "1" });
      if (!karneKilit) {
        try {
          const { data: kisiler } = await db.from("participants").select("id").eq("role", "participant");
          for (const k of kisiler ?? []) {
            await katilimciyaBildir(
              db,
              k.id,
              "📊 Pazar Karnesi zamanı",
              "Bu haftanın üç sayısı: kaç davet, kaç görüşme, kaç takip? Karneni ver — kamp arkadaşın tanığın olsun.",
              "/karne"
            ).catch(() => {});
          }
        } catch {
          // sessizce geç
        }
      }
    }
  }

  // [E#37] HAFTALIK KOÇ NOTU DÜRTÜSÜ: yolculuk modunda Pazar 19:00'da (karne
  // dürtüsünden sonra) mühürlü sözü olan herkese "koç notun hazır" push'u —
  // kişi /takip'te bu haftanın değerlendirmesini + gelecek haftanın tek odağını
  // görür (not deterministik, /takip'te render edilir; tik'te AI/hesap yok).
  if (mod === "yolculuk") {
    const pazarMiKoc =
      new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Istanbul", weekday: "short" }).format(simdi) === "Sun";
    if (pazarMiKoc && saat === 19 && dakika < 10) {
      const { error: kocKilit } = await db
        .from("settings")
        .insert({ key: `hafta_koc_${bugun}`, value: "1" });
      if (!kocKilit) {
        try {
          const { data: sozluler } = await db.from("soz").select("participant_id").eq("durum", "sesli");
          for (const s of sozluler ?? []) {
            await katilimciyaBildir(
              db,
              s.participant_id,
              "🧭 Haftalık koç notun hazır",
              "Bu haftanın değerlendirmesi ve gelecek haftanın tek odağı seni bekliyor. Aç, gör.",
              "/takip"
            ).catch(() => {});
          }
        } catch {
          // sessizce geç
        }
      }
    }
  }

  // 3f-3) P1 KANIT DEFTERİ GERİ OKUMA: yolculuk 30/60/90. günde sabah, herkese
  // "şu kadar kanıt biriktirdin" — inanç birikmiş kanıtla değişir. Milestone
  // başına tek sefer (settings kilidi). Kendi hatasını yutar.
  if (mod === "yolculuk" && [30, 60, 90].includes(gun) && saat === 9 && dakika < 10) {
    const { error: kanitKilit } = await db
      .from("settings")
      .insert({ key: `kanit_geri_okuma_${gun}`, value: "1" });
    if (!kanitKilit) {
      try {
        const kanitlar = await tumKayitlar<{ participant_id: string }>((b, s) =>
          db.from("protokol_tamamlama").select("participant_id").eq("pratik_kodu", "P1").order("id").range(b, s)
        );
        const say = new Map<string, number>();
        for (const k of kanitlar) say.set(k.participant_id, (say.get(k.participant_id) ?? 0) + 1);
        for (const [pid, adet] of say) {
          if (adet < 1) continue;
          await katilimciyaBildir(
            db,
            pid,
            `📓 ${gun}. gün — Kanıt Defterin`,
            `${gun} günde ${adet} kanıt biriktirdin. Bunların hepsi senin — 'yetersizim' inancı bu defterin karşısında duramaz.`,
            "/protokol"
          ).catch(() => {});
        }
      } catch {
        // sessizce geç
      }
    }
  }

  // [D#33] AY DÖNÜMÜ MEKTUBU DUYURUSU: yolculuk 30/60/90. günde sabah 09:10-09:19
  // (kanıt geri okumadan hemen sonra) mühürlü sözü olan herkese "mektubun hazır"
  // push'u — mektup /takip'te AÇILINCA lazy üretilir (tik'te AI YOK, timeout yok).
  if (mod === "yolculuk" && [30, 60, 90].includes(gun) && saat === 9 && dakika >= 10 && dakika < 20) {
    const { error: mektupKilit } = await db
      .from("settings")
      .insert({ key: `ay_mektubu_duyuru_${gun}`, value: "1" });
    if (!mektupKilit) {
      try {
        const { data: sozluler } = await db.from("soz").select("participant_id").eq("durum", "sesli");
        for (const s of sozluler ?? []) {
          await katilimciyaBildir(
            db,
            s.participant_id,
            `📜 ${gun}. gün mektubun hazır`,
            `AYNA, ${gun}. günü doldurduğun için sana özel bir mektup yazdı. Aç, oku.`,
            "/takip"
          ).catch(() => {});
        }
      } catch {
        // sessizce geç
      }
    }
  }

  // 3g) [FAZ 5 · Tek Söz birleşmesi] KALDIRILDI: eski v1 (pledges) haftalık
  // Çarşamba söz hatırlatması — "Ağustos görüşme sözü" dili + ölü /soz ekranına
  // yönlendiriyordu. SÖZ v2'ye (soz/soz_takip + şahitler) geçince bu iş zaten
  // sozTakip tarafından yapılıyor (Pazartesi akran check-in + eskalasyon).
  // Mükerrer + yanlış-hedefli v1 hatırlatması kaldırıldı.

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
  // [FAZ 5] YALNIZ KAMP: kamp roster'ından günlük mentor ataması kamp-içi bir
  // sosyal mekaniktir; yolculukta (90 gün) her gün tekrar etmesi gürültüdür.
  if (mod === "kamp" && saat === 10 && !sahneSessiz) {
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

  // D10 — GÜN 3 "SENİ İZLEDİM" AYNASI: son gün sabah 09:00'da herkese AYNA'nın
  // 3 günlük yansıması + tek soru ("90 gün sonra nerede?") → söz tohumu. Gün
  // başına tek sefer (settings kilidi). Kendi hatasını yutar, tik'i düşürmez.
  if (mod === "kamp" && gun === 3 && saat === 9 && !sahneSessiz) {
    const { error: siKilit } = await db
      .from("settings")
      .insert({ key: `seni_izledim_${bugun}`, value: "1" });
    if (!siKilit) {
      try {
        ozet.uretilen += await seniIzledimAc(db);
      } catch {
        // sessizce geç
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
  // [FAZ 5 · U19] YALNIZ KAMP: fısıltı 360° değerlendirmeye ("Gün 3'te aynanda",
  // /degerlendir) demirli — bu yalnız kampta olur. Yolculukta ratings sorgusu boş
  // döner ama yine de kamp diliyle ateşleme riski + gereksiz sorgu; mod'a gate'lendi.
  // Faz 4 — KAMP RADYOSU: sabah 07:30 + akşam 21:30 (üretim ~20 dk önce başlar).
  // Kendi hatasını yutar, tik'i asla düşürmez; kill switch radyoyu da kapatır.
  if (mod === "kamp") await radyoTik(db, gun, gunDk, bugun);

  // KAPANIŞ — "Salonun Röntgeni" sahne öncesi brifi: Gün 3'te 07:30 ana brif +
  // 11:20 güncel (değerlendirme sonrası) sürüm. Üretim ~20 dk önce; teslimde
  // admin'e push. Kendi hatasını yutar, tik'i asla düşürmez.
  if (mod === "kamp") await kapanisBrifTik(db, gun, gunDk, bugun);

  // A8 — AKŞAM TAKDİR ZARFI: 22:00'de o gün takdir alan herkese "zarfını aç"
  // push'u (gün başına tek sefer). Kendi hatasını yutar, tik'i düşürmez.
  if (mod === "kamp") {
    try {
      ozet.takdirZarfi = await takdirZarfiTik(db, gunDk, bugun);
    } catch {
      // sessizce geç
    }
  }

  // A7 — SESSİZ KAHRAMAN: 19:00'da çok gönderip az alan kişiyi doğrudan onurlandır
  // (radyoya dokunmadan, isimli anons değil — kişiye özel). Kill-switch'li.
  if (mod === "kamp") {
    try {
      ozet.sessizKahraman = await sessizKahramanTik(db, gunDk, bugun);
    } catch {
      // sessizce geç
    }
  }

  // G3 — REKORLAR taraması: kamp modunda, bayrak açıkken mevcut verilerden
  // rekorları hesaplar, kırılanı herkese duyurur. Kendi hatasını yutar.
  if (mod === "kamp" && (await rekorlarAcikMi(db))) await rekorTara(db);

  // G4 — ÇİFT SERİSİ: kamp modunda, bayrak açıkken ortak alevleri besle/söndür +
  // 20:00 nazik hatırlatma. Kendi hatasını yutar.
  if (mod === "kamp" && (await ciftSerisiAcikMi(db)))
    await ciftSerisiDegerlendir(db, simdi, saat, dakika);

  // G6 — HAMLE SIRASI: kamp modunda, bayrak açıkken tamamlanmış eşleşmeli
  // görevlerden hamle üret + 20:30 nazik hatırlatma. Kendi hatasını yutar.
  if (mod === "kamp" && (await hamleAcikMi(db))) {
    await hamleTaraOlustur(db, simdi);
    if (saat === 20 && dakika >= 30) await hamleHatirlat(db, simdi);
  }

  // G8 — KAYIP EŞYA bakımı: 48s bulunmayan tura ipucu, biten pay penceresini
  // kapat. Bayrak açıkken (mod bağımsız — keşif kampta da yolculukta da olabilir).
  if (await kayipAcikMi(db)) await kayipBakimTik(db, simdi);

  if (mod === "kamp" && (saat === 13 || saat === 20) && !sahneSessiz) {
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
