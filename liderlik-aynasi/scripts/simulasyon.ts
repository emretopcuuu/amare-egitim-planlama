// DAVRANIŞ MİMARİSİ SİMÜLASYONU
// 90 günlük, çok-ajanlı sentetik koşum: lib/davranis.ts'teki saf çekirdeğin
// (eustress, momentum, kayma, fazlar, senkron, radar) davranışını iddialarla
// doğrular. Koşum: npx tsx scripts/simulasyon.ts

import {
  zorlukSec,
  momentumPuanla,
  momentumMesaji,
  kaymaKarari,
  fazBul,
  YOLCULUK_FAZLARI,
  yolculukGunuHesapla,
  senkronAnahtari,
  senkronYedekSec,
  radarHesapla,
  ZORLUK_YONERGESI,
  ZORLUK_ETIKETI,
  turSec,
  GOREV_TURLERI,
  type Zorluk,
} from "../lib/davranis";
import {
  limitAsildiMi,
  MAX_BASARISIZ_IP,
  MAX_BASARISIZ_GLOBAL,
} from "../lib/auth/rateLimitKural";
import { dusukGuvenMi, MIN_DEGERLENDIREN } from "../lib/raporGuven";
import {
  WA_SABLONLAR,
  sablonBul,
  ilkAd,
  degiskenleriUret,
  onizleme,
  twilioTipleri,
} from "../lib/whatsappSablonlari";
import {
  KAMP_GUNLERI,
  kampGunleri,
  KAMP_PROGRAMI,
  kampGunu,
  gunProgrami,
  dakikaCevir,
  suankiMadde,
  sahneSessizMi,
  sabahPenceresiMi,
  kampSenkronAnahtari,
  GECE_FISILTILARI,
  geceYansimaMetni,
  ACILIS_ANONSU,
  aynaAniMetni,
} from "../lib/kampProgrami";
import { kampOncesiAdim, type AkisDurum } from "../lib/akis";
import {
  KARIYER_BASAMAKLARI,
  GUNLUK_SAAT_SECENEKLERI,
  SURE_SECENEKLERI,
  kariyerPlaniHesapla,
  ovSimulasyonu,
  gerekliTempo,
  makuSure,
  mevcutRutbeIndex,
  simulasyonMilestonelari,
  OV_SENARYOLAR,
  HBB_AYLAR,
  HBB_TOPLAM,
} from "../lib/kariyer";
import {
  bugunTr,
  takipDurumHesapla,
  eskalasyonKarar,
  DURTME_THROTTLE_MS,
  TANIK_THROTTLE_MS,
} from "../lib/takipHesap";


let basarili = 0;
let basarisiz = 0;
const hatalar: string[] = [];

function iddia(kosul: boolean, mesaj: string) {
  if (kosul) {
    basarili++;
  } else {
    basarisiz++;
    hatalar.push(mesaj);
    console.error(`  ✗ ${mesaj}`);
  }
}

// Deterministik sözde-rastgele (tekrarlanabilir koşum)
let tohum = 42;
function rasgele(): number {
  tohum = (tohum * 1103515245 + 12345) & 0x7fffffff;
  return tohum / 0x7fffffff;
}

// ---------------------------------------------------------------
console.log("\n■ 1) EUSTRESS MOTORU — 90 günlük ajan koşumu");
// ---------------------------------------------------------------

type Gorev = { status: "scored" | "expired"; ai_score: number | null; zorluk: Zorluk };
type Ajan = {
  ad: string;
  beceri: number; // 0-1
  gunlukYanitOlasiligi: (gun: number) => number;
  gecmis: Gorev[];
  zorlukSerisi: Zorluk[];
};

const ajanlar: Ajan[] = [
  {
    ad: "Yıldız",
    beceri: 0.92,
    gunlukYanitOlasiligi: () => 0.97,
    gecmis: [],
    zorlukSerisi: [],
  },
  {
    ad: "İstikrarlı",
    beceri: 0.6,
    gunlukYanitOlasiligi: () => 0.85,
    gecmis: [],
    zorlukSerisi: [],
  },
  {
    ad: "Sönen",
    beceri: 0.7,
    gunlukYanitOlasiligi: (g) => (g < 18 ? 0.9 : 0.05),
    gecmis: [],
    zorlukSerisi: [],
  },
  {
    ad: "Dalgalı",
    beceri: 0.5,
    gunlukYanitOlasiligi: (g) => (g % 7 < 4 ? 0.85 : 0.35),
    gecmis: [],
    zorlukSerisi: [],
  },
];

function formCikar(gecmis: Gorev[]) {
  const son6 = gecmis.slice(-6);
  const puanli = son6.filter((g) => g.ai_score !== null);
  return {
    puanOrt: puanli.length
      ? puanli.reduce((t, g) => t + (g.ai_score ?? 0), 0) / puanli.length
      : null,
    teslimOrani: son6.length
      ? son6.filter((g) => g.status === "scored").length / son6.length
      : 1,
    sonSuresiDoldu: son6.length
      ? son6[son6.length - 1].status === "expired"
      : false,
  };
}

const haftalikVeri = new Map<
  string,
  { verilen: number; teslim: number; zamaninda: number; puanlar: number[] }[]
>();
for (const a of ajanlar) {
  haftalikVeri.set(
    a.ad,
    Array.from({ length: 13 }, () => ({
      verilen: 0,
      teslim: 0,
      zamaninda: 0,
      puanlar: [],
    }))
  );
}

for (let gun = 1; gun <= 90; gun++) {
  const kampMi = gun <= 3;
  const gorevSayisi = kampMi ? 4 : 1; // kamp yoğun, yolculuk günde 1
  const hafta = Math.floor((gun - 1) / 7);
  for (const a of ajanlar) {
    for (let i = 0; i < gorevSayisi; i++) {
      const zorluk = zorlukSec(formCikar(a.gecmis));
      a.zorlukSerisi.push(zorluk);
      const h = haftalikVeri.get(a.ad)![hafta];
      h.verilen++;
      const yanitlar = rasgele() < a.gunlukYanitOlasiligi(gun);
      if (!yanitlar) {
        a.gecmis.push({ status: "expired", ai_score: null, zorluk });
        continue;
      }
      // akış modeli: zorluk beceriye uyduğunda kalite artar
      const hedefZorluk = 1 + a.beceri * 2; // 1..3
      const uyum = 1 - Math.min(1, Math.abs(zorluk - hedefZorluk) / 2);
      const puan = Math.max(
        1,
        Math.min(10, Math.round(3 + a.beceri * 5 + uyum * 2 + (rasgele() - 0.5)))
      );
      a.gecmis.push({ status: "scored", ai_score: puan, zorluk });
      h.teslim++;
      if (rasgele() < 0.9) h.zamaninda++;
      h.puanlar.push(puan);
    }
  }
}

for (const a of ajanlar) {
  const ozet = { 1: 0, 2: 0, 3: 0 } as Record<Zorluk, number>;
  for (const z of a.zorlukSerisi) ozet[z]++;
  console.log(
    `  ${a.ad.padEnd(10)} zorluk dağılımı → 1:${ozet[1]}  2:${ozet[2]}  3:${ozet[3]}`
  );
}

const yildiz = ajanlar[0];
const ilk3 = yildiz.zorlukSerisi.findIndex((z) => z === 3);
iddia(ilk3 >= 0 && ilk3 <= 8, `Yıldız ajan ≤8 görevde zorluk 3'e ulaşmalı (ulaştı: ${ilk3 + 1}. görev)`);
const yildizSon = yildiz.zorlukSerisi.slice(20);
iddia(
  yildizSon.filter((z) => z === 3).length / yildizSon.length >= 0.7,
  "Yıldız ajan oturduktan sonra ağırlıkla zorluk 3 almalı"
);

const sonen = ajanlar[2];
// Bırakış günü 18 → görev indeksi ~26 (kampta 12 + günde 1). Motor 6 görevlik
// pencereyle kanıt toplar; tepki gecikmesi en çok 6 görev olmalı.
const birakisIndeksi = 26;
const dususIndeksi = sonen.zorlukSerisi.findIndex(
  (z, i) => i >= birakisIndeksi && z === 1
);
iddia(
  dususIndeksi >= 0 && dususIndeksi - birakisIndeksi <= 6,
  `Sönen ajan bırakıştan ≤6 görev sonra zorluk 1'e inmeli (indi: +${dususIndeksi - birakisIndeksi})`
);
const sonenGec = sonen.zorlukSerisi.slice(birakisIndeksi + 7, 60);
iddia(
  sonenGec.filter((z) => z === 1).length / sonenGec.length >= 0.9,
  "Sönen ajan düşüş sonrası ≥%90 zorluk 1'de kalmalı (nadir tek yanıtlar pencereyi kısaca oynatabilir)"
);

// Düşük formda asla 3 verilmediğini birebir kural üzerinden doğrula
iddia(zorlukSec({ puanOrt: 4.9, teslimOrani: 1, sonSuresiDoldu: false }) === 1, "puanOrt<5 → zorluk 1");
iddia(zorlukSec({ puanOrt: 8, teslimOrani: 0.79, sonSuresiDoldu: false }) === 2, "teslim<0.8 iken 3 verilmez");
iddia(zorlukSec({ puanOrt: null, teslimOrani: 1, sonSuresiDoldu: false }) === 2, "veri yokken denge (2)");
iddia(zorlukSec({ puanOrt: 9, teslimOrani: 1, sonSuresiDoldu: true }) === 1, "son görev süresi dolduysa önce tamir (1)");
iddia(!!ZORLUK_YONERGESI[1] && !!ZORLUK_YONERGESI[2] && !!ZORLUK_YONERGESI[3], "her zorluk için yönerge var");
iddia(!!ZORLUK_ETIKETI[1] && !!ZORLUK_ETIKETI[3], "her zorluk için etiket var");

// ---------------------------------------------------------------
console.log("\n■ 2) MOMENTUM ENDEKSİ — haftalık seriler");
// ---------------------------------------------------------------

const momentumSerileri = new Map<string, number[]>();
for (const a of ajanlar) {
  const haftalar = haftalikVeri.get(a.ad)!;
  const seri: number[] = [];
  for (let h = 0; h < 13; h++) {
    const bu = haftalar[h];
    const onceki = h > 0 ? haftalar[h - 1] : null;
    const sonuc = momentumPuanla({
      verilen: bu.verilen,
      teslim: bu.teslim,
      zamaninda: bu.zamaninda,
      puanlar: bu.puanlar,
      oncekiPuanlar: onceki?.puanlar ?? [],
      degerlendirme: Math.round(bu.teslim * 2.5), // aktif olan değerlendirir
    });
    seri.push(sonuc.skor);
    iddia(sonuc.skor >= 0 && sonuc.skor <= 100, `momentum 0-100 aralığında (${a.ad} hafta ${h + 1}: ${sonuc.skor})`);
  }
  momentumSerileri.set(a.ad, seri);
  console.log(`  ${a.ad.padEnd(10)} momentum → ${seri.map((s) => String(s).padStart(3)).join(" ")}`);
}

iddia((momentumSerileri.get("Yıldız")![3] ?? 0) >= 70, "Yıldız 4. hafta momentumu ≥70 olmalı");
iddia((momentumSerileri.get("Sönen")![3] ?? 100) <= 40, "Sönen 4. hafta momentumu ≤40 olmalı (kopuş görünür)");
iddia(
  (momentumSerileri.get("Sönen")![1] ?? 0) > (momentumSerileri.get("Sönen")![4] ?? 0),
  "Sönen ajanın momentumu bırakma sonrası düşmeli"
);
iddia(momentumMesaji(85, 70).includes("85"), "momentum mesajı skoru içermeli");
iddia(momentumMesaji(30, 50).includes("▼"), "düşen momentumda yön oku ▼");
const notrSkor = momentumPuanla({ verilen: 0, teslim: 0, zamaninda: 0, puanlar: [], oncekiPuanlar: [], degerlendirme: 0 }).skor;
iddia(notrSkor === 38, `hiç veri yokken nötr taban (18+10+0+10=38, bulundu: ${notrSkor})`);

// ---------------------------------------------------------------
console.log("\n■ 3) KAYMA RADARI — saatlik tarama");
// ---------------------------------------------------------------

{
  const saatMs = 3_600_000;
  const baslangic = Date.UTC(2026, 5, 15, 6, 0, 0);
  // Kamp modu: 6 saat sessizlikte dürt, 12 saatte uyar; tekrarlar sınırlı
  let nudgeSayisi = 0;
  let alertSayisi = 0;
  let sonNudge: number | null = null;
  let sonAlert: number | null = null;
  let ilkNudgeSaati = -1;
  let ilkAlertSaati = -1;
  const sonEtkinlik = baslangic; // 06:00'da son etkinlik, sonra sessiz
  for (let s = 0; s <= 24; s++) {
    const simdi = baslangic + s * saatMs;
    const karar = kaymaKarari(sonEtkinlik, simdi, "kamp", sonNudge, sonAlert);
    if (karar.nudge) {
      nudgeSayisi++;
      sonNudge = simdi;
      if (ilkNudgeSaati < 0) ilkNudgeSaati = s;
    }
    if (karar.alert) {
      alertSayisi++;
      sonAlert = simdi;
      if (ilkAlertSaati < 0) ilkAlertSaati = s;
    }
  }
  console.log(
    `  24 saat sessizlik (kamp): ilk dürtme ${ilkNudgeSaati}. saat, ilk uyarı ${ilkAlertSaati}. saat, toplam dürtme ${nudgeSayisi}, uyarı ${alertSayisi}`
  );
  iddia(ilkNudgeSaati === 6, `kamp: ilk dürtme tam 6. saatte (bulundu: ${ilkNudgeSaati})`);
  iddia(ilkAlertSaati === 12, `kamp: lider uyarısı 12. saatte (bulundu: ${ilkAlertSaati})`);
  iddia(nudgeSayisi === 2, `kamp: 24 saatte en çok 2 dürtme — 12 saat tekrar koruması (bulundu: ${nudgeSayisi})`);
  iddia(alertSayisi === 1, `kamp: 24 saatte 1 lider uyarısı (bulundu: ${alertSayisi})`);

  // Aktif kişi asla dürtülmez
  const aktifKarar = kaymaKarari(baslangic + 23 * saatMs, baslangic + 24 * saatMs, "kamp", null, null);
  iddia(!aktifKarar.nudge && !aktifKarar.alert, "1 saattir aktif kişi dürtülmez");

  // Hiç başlamamış kişi kayma değil onboarding konusu
  const hicKarar = kaymaKarari(null, baslangic, "kamp", null, null);
  iddia(!hicKarar.nudge && !hicKarar.alert, "hiç etkinliği olmayan kişi kayma radarına girmez");

  // Yolculuk modu eşikleri
  iddia(!kaymaKarari(baslangic, baslangic + 47 * saatMs, "yolculuk", null, null).nudge, "yolculuk: 47 saatte dürtme YOK");
  iddia(kaymaKarari(baslangic, baslangic + 48 * saatMs, "yolculuk", null, null).nudge, "yolculuk: 48 saatte dürtme VAR");
  iddia(kaymaKarari(baslangic, baslangic + 96 * saatMs, "yolculuk", null, null).alert, "yolculuk: 96 saatte lider uyarısı");
}

// ---------------------------------------------------------------
console.log("\n■ 4) 90 GÜNLÜK YOLCULUK — faz haritası");
// ---------------------------------------------------------------

{
  const beklenen: [number, string][] = [
    [1, "Kurulum ve Keşif"],
    [3, "Kurulum ve Keşif"],
    [4, "İlk Deneyimler"],
    [10, "İlk Deneyimler"],
    [11, "Aksiyona Giriş"],
    [20, "Aksiyona Giriş"],
    [21, "Momentum"],
    [30, "Momentum"],
    [31, "Direnç"],
    [60, "Direnç"],
    [61, "Bağımsızlık"],
    [90, "Bağımsızlık"],
    [120, "Bağımsızlık"], // taşma güvenliği
  ];
  for (const [gun, ad] of beklenen) {
    iddia(fazBul(gun).ad === ad, `gün ${gun} → ${ad} (bulundu: ${fazBul(gun).ad})`);
  }
  // boşluksuz ve örtüşmesiz kapsama
  for (let g = 1; g <= 90; g++) {
    const kapsayan = YOLCULUK_FAZLARI.filter(
      (f) => g >= f.baslangicGunu && g <= f.bitisGunu
    );
    iddia(kapsayan.length === 1, `gün ${g} tam bir faza düşmeli (bulundu: ${kapsayan.length})`);
  }
  const dGun = yolculukGunuHesapla(
    "2026-06-01T09:00:00+03:00",
    new Date("2026-06-15T09:00:00+03:00")
  );
  iddia(dGun === 15, `yolculuk günü hesabı: 1 Haz → 15 Haz = 15. gün (bulundu: ${dGun})`);
  console.log("  faz haritası gün 1-90 boşluksuz doğrulandı");
}

// ---------------------------------------------------------------
console.log("\n■ 5) SENKRON AN — pencere kilidi");
// ---------------------------------------------------------------

{
  // 2 gün boyunca 5 dakikalık tikler (kamp): yalnız 12 ve 17 pencereleri, günde 2
  const ateslenen = new Set<string>();
  for (let gun = 0; gun < 2; gun++) {
    for (let dk = 0; dk < 24 * 60; dk += 5) {
      const saat = Math.floor(dk / 60);
      const dakika = dk % 60;
      const tarih = gun === 0 ? "2026-06-15" : "2026-06-16";
      const anahtar = senkronAnahtari({ mod: "kamp", haftaninGunu: 1 + gun, saat, dakika, tarih });
      if (anahtar && !ateslenen.has(anahtar)) ateslenen.add(anahtar);
    }
  }
  console.log(`  kamp 2 gün → ateşlenen pencereler: ${[...ateslenen].join(", ")}`);
  iddia(ateslenen.size === 4, `kamp: 2 günde tam 4 senkron penceresi (bulundu: ${ateslenen.size})`);
  iddia(
    [...ateslenen].every((a) => a.endsWith("_12") || a.endsWith("_17")),
    "kamp pencereleri yalnız 12 ve 17"
  );

  // Yolculuk: 2 hafta tiklerinde yalnız Çarşamba 20:00, haftada 1
  const yolculukAteslenen = new Set<string>();
  for (let gun = 0; gun < 14; gun++) {
    for (let dk = 0; dk < 24 * 60; dk += 5) {
      const anahtar = senkronAnahtari({
        mod: "yolculuk",
        haftaninGunu: gun % 7, // 0=Pazar
        saat: Math.floor(dk / 60),
        dakika: dk % 60,
        tarih: `2026-07-${String(gun + 1).padStart(2, "0")}`,
      });
      if (anahtar) yolculukAteslenen.add(anahtar);
    }
  }
  iddia(yolculukAteslenen.size === 2, `yolculuk: 2 haftada 2 pencere (bulundu: ${yolculukAteslenen.size})`);
  iddia([...yolculukAteslenen].every((a) => a.endsWith("_20")), "yolculuk penceresi 20:00");

  // Yedek görev deterministik ve dolu
  const y1 = senkronYedekSec("senkron_2026-06-15_12");
  const y2 = senkronYedekSec("senkron_2026-06-15_12");
  iddia(y1.baslik === y2.baslik && y1.govde.length > 10, "senkron yedeği deterministik ve dolu");
}

// ---------------------------------------------------------------
console.log("\n■ 6) GÖREV TÜRÜ SEÇİMİ — mod ve faz uyumu");
// ---------------------------------------------------------------

{
  // zar süpürmesiyle determinist tarama
  for (let z = 0; z < 1; z += 0.04) {
    const kampTur = turSec(1, 11, [], "kamp", z);
    iddia((GOREV_TURLERI as readonly string[]).includes(kampTur), `kamp türü geçerli: ${kampTur}`);
  }
  const gun1Turleri = new Set<string>();
  for (let z = 0; z < 1; z += 0.01) gun1Turleri.add(turSec(1, 11, [], "kamp", z));
  iddia(!gun1Turleri.has("simulasyon"), "kamp gün 1: simülasyon ağırlığı 0");
  const gun2Turleri = new Set<string>();
  for (let z = 0; z < 1; z += 0.01) gun2Turleri.add(turSec(2, 15, [], "kamp", z));
  iddia(gun2Turleri.has("simulasyon"), "kamp gün 2+: simülasyon havuzda");

  // yolculuk fazlarında türler faz listesinden gelmeli
  for (const faz of YOLCULUK_FAZLARI) {
    const izinli = new Set(faz.turAgirliklari.map(([t]) => t));
    for (let z = 0; z < 1; z += 0.02) {
      const tur = turSec(faz.baslangicGunu, 10, [], "yolculuk", z);
      iddia(izinli.has(tur), `yolculuk ${faz.ad}: tür faz listesinden (${tur})`);
    }
  }
  console.log("  tür seçimi kamp+6 faz boyunca tarandı");
}

// ---------------------------------------------------------------
console.log("\n■ 7) KOMUTAN RADARI — uç değerler");
// ---------------------------------------------------------------

{
  const bos = radarHesapla({
    toplamKisi: 0, aktif24s: 0, verilen48s: 0, teslim48s: 0,
    caprazBag: 0, toplamBag: 0, beklenenPuan: 0, girilenPuan: 0, direncPuanlari: [],
  });
  iddia(bos.katilim === 0 && bos.tamamlama === 0, "boş sistemde katılım/tamamlama 0");
  iddia(bos.gorevMomentumu === 50 && bos.aidiyet === 50 && bos.retDirenci === 50, "veri yokken nötr eksenler 50");
  const dolu = radarHesapla({
    toplamKisi: 100, aktif24s: 100, verilen48s: 50, teslim48s: 50,
    caprazBag: 40, toplamBag: 40, beklenenPuan: 1000, girilenPuan: 2000, direncPuanlari: [10, 10],
  });
  iddia(
    dolu.katilim === 100 && dolu.gorevMomentumu === 100 && dolu.aidiyet === 100 &&
    dolu.tamamlama === 100 && dolu.retDirenci === 100,
    "tam sistemde tüm eksenler 100'de kapaklanır"
  );
  const yarim = radarHesapla({
    toplamKisi: 100, aktif24s: 37, verilen48s: 80, teslim48s: 40,
    caprazBag: 12, toplamBag: 48, beklenenPuan: 400, girilenPuan: 100, direncPuanlari: [6, 8],
  });
  iddia(yarim.katilim === 37 && yarim.gorevMomentumu === 50 && yarim.aidiyet === 25 && yarim.tamamlama === 25 && yarim.retDirenci === 70,
    `ara değerler doğru (${JSON.stringify(yarim)})`);
}

// ---------------------------------------------------------------
console.log("\n■ 8) KAMP PROGRAMI — Sapanca akışı ve zaman pencereleri");
// ---------------------------------------------------------------

{
  // Tarih → kamp günü eşlemesi
  iddia(kampGunu("2026-07-17") === 1, "17 Temmuz → Gün 1");
  iddia(kampGunu("2026-07-18") === 2, "18 Temmuz → Gün 2");
  iddia(kampGunu("2026-07-19") === 3, "19 Temmuz → Gün 3");
  iddia(kampGunu("2026-07-16") === null, "16 Temmuz kamp dışı");

  // DİNAMİK kamp günleri: başlangıç verilince 3 gün o tarihten türetilir.
  iddia(kampGunu("2026-06-29", "2026-06-29") === 1, "başlangıç günü → Gün 1");
  iddia(kampGunu("2026-06-30", "2026-06-29") === 2, "başlangıç +1 → Gün 2");
  iddia(kampGunu("2026-07-01", "2026-06-29") === 3, "başlangıç +2 → Gün 3");
  iddia(kampGunu("2026-07-02", "2026-06-29") === null, "başlangıç +3 kamp dışı");
  iddia(kampGunu("2026-07-17", "2026-06-29") === null, "dinamikte sabit tarih kamp dışı");
  // Ay sonu taşması (TZ/DST'den bağımsız gün ekleme)
  iddia(kampGunleri("2026-01-31")[1] === "2026-02-01", "31 Ocak +1 = 1 Şubat");
  iddia(kampGunleri("2026-03-28")[2] === "2026-03-30", "DST haftasında +2 doğru");

  // Program bütünlüğü: her gün kronolojik ve çakışmasız
  for (const gun of [1, 2, 3] as const) {
    const m = gunProgrami(gun);
    iddia(m.length >= 5, `Gün ${gun} en az 5 madde içerir (bulundu: ${m.length})`);
    for (let i = 0; i < m.length; i++) {
      iddia(
        dakikaCevir(m[i].bitis) > dakikaCevir(m[i].baslangic),
        `Gün ${gun} '${m[i].baslik}': bitiş başlangıçtan sonra`
      );
      if (i > 0) {
        iddia(
          dakikaCevir(m[i].baslangic) >= dakikaCevir(m[i - 1].bitis),
          `Gün ${gun} '${m[i].baslik}': önceki maddeyle çakışmaz`
        );
      }
    }
  }
  iddia(KAMP_PROGRAMI.length === 23, `programda 23 madde (bulundu: ${KAMP_PROGRAMI.length})`);

  // O anki madde: sınırlar dahil/hariç doğru
  iddia(suankiMadde(1, dakikaCevir("12:59"))?.baslik.includes("Otel") === true, "Gün 1 12:59 → Otel Giriş");
  iddia(suankiMadde(1, dakikaCevir("13:00"))?.baslik.includes("Öğle") === true, "Gün 1 13:00 → Öğle Yemeği (başlangıç dahil)");
  iddia(suankiMadde(2, dakikaCevir("11:00"))?.tur === "oyun", "Gün 2 11:00 → Oyun I");
  iddia(suankiMadde(1, dakikaCevir("23:30"))?.tur === "sahne", "Gün 1 23:30 → David Chung Q&A (sahne)");
  iddia(suankiMadde(1, dakikaCevir("23:55")) === null, "Gün 1 23:55 → boşluk (program bitti)");

  // Sahne sessizliği: kürsü açıkken sus, aralarda konuş
  iddia(sahneSessizMi(1, dakikaCevir("21:30")), "Gün 1 21:30 (David Chung) sessiz");
  iddia(!sahneSessizMi(1, dakikaCevir("22:15")), "Gün 1 22:15 (ara) sessiz DEĞİL");
  iddia(sahneSessizMi(1, dakikaCevir("22:40")), "Gün 1 22:40 (panel) sessiz");
  iddia(!sahneSessizMi(1, dakikaCevir("20:00")), "Gün 1 20:00 (yemek) sessiz değil");
  iddia(!sahneSessizMi(2, dakikaCevir("22:00")), "Gün 2 22:00 (AYNA görevlendirmeleri) sessiz DEĞİL — telefonlar elde");
  iddia(!sahneSessizMi(3, dakikaCevir("09:30")), "Gün 3 09:30 (kahvaltı & checkout) sessiz değil");
  iddia(sahneSessizMi(3, dakikaCevir("10:00")), "Gün 3 10:00 (PD101 kapanış oturumu) sessiz");
  iddia(sahneSessizMi(3, dakikaCevir("10:30")), "Gün 3 10:30 (PD yolculuğu kürsüde) sessiz");
  iddia(!sahneSessizMi(3, dakikaCevir("12:00")), "Gün 3 12:00 (AYNA Kamp Analizi) sessiz DEĞİL — telefonlar elde");

  // Senkron: kamp tarihlerinde 5 dk'lık tik süpürmesi — günde tam 1 pencere
  const kampSenkronlar = new Set<string>();
  for (const tarih of KAMP_GUNLERI) {
    for (let dk = 0; dk < 24 * 60; dk += 5) {
      const a = senkronAnahtari({
        mod: "kamp",
        haftaninGunu: 5,
        saat: Math.floor(dk / 60),
        dakika: dk % 60,
        tarih,
      });
      if (a) kampSenkronlar.add(a);
    }
  }
  console.log(`  kamp senkron pencereleri: ${[...kampSenkronlar].join(", ")}`);
  iddia(kampSenkronlar.size === 3, `kamp 3 günde tam 3 senkron penceresi (bulundu: ${kampSenkronlar.size})`);
  iddia(
    kampSenkronlar.has("senkron_2026-07-17_g1") &&
      kampSenkronlar.has("senkron_2026-07-18_g2") &&
      kampSenkronlar.has("senkron_2026-07-19_g3"),
    "pencere anahtarları gün bazlı"
  );
  iddia(
    senkronAnahtari({ mod: "kamp", haftaninGunu: 5, saat: 12, dakika: 0, tarih: "2026-07-18" }) === null,
    "kamp tarihinde eski 12:00 penceresi ateşlenmez"
  );
  iddia(
    kampSenkronAnahtari("2026-07-17", 20, 14) === null &&
      kampSenkronAnahtari("2026-07-17", 20, 15) !== null &&
      kampSenkronAnahtari("2026-07-17", 20, 25) === null,
    "Gün 1 penceresi tam 20:15-20:24"
  );
  iddia(
    kampSenkronAnahtari("2026-07-19", 9, 29) === null &&
      kampSenkronAnahtari("2026-07-19", 9, 30) !== null &&
      kampSenkronAnahtari("2026-07-19", 9, 39) !== null &&
      kampSenkronAnahtari("2026-07-19", 9, 40) === null,
    "Gün 3 penceresi tam 09:30-09:39 (kahvaltı & checkout, oturumlardan önce)"
  );

  // Senkron anları sahne sessizliğine denk gelmez
  for (const tarih of KAMP_GUNLERI) {
    const gun = kampGunu(tarih)!;
    for (let dk = 0; dk < 24 * 60; dk++) {
      const a = kampSenkronAnahtari(tarih, Math.floor(dk / 60), dk % 60);
      if (a) {
        iddia(!sahneSessizMi(gun, dk), `senkron penceresi sahneye çakışmaz (gün ${gun}, dk ${dk})`);
      }
    }
  }

  // Sabah yoklaması pencereleri
  iddia(!sabahPenceresiMi(2, 6, 39) && sabahPenceresiMi(2, 6, 40), "Gün 2 sabah penceresi 06:40'ta açılır");
  iddia(sabahPenceresiMi(2, 7, 59) && !sabahPenceresiMi(2, 8, 0), "Gün 2 penceresi 08:00'de kapanır");
  iddia(sabahPenceresiMi(3, 7, 0) && sabahPenceresiMi(3, 8, 59) && !sabahPenceresiMi(3, 9, 0), "Gün 3 penceresi 07:00-08:59");
  iddia(!sabahPenceresiMi(1, 7, 30), "Gün 1 sabah yoklaması yok");

  // Görev türü etkinlik yanlılığı: oyun saatinde gözlem, molada yansıma artar
  function turSay(etkinlik: Parameters<typeof turSec>[5]): Map<string, number> {
    const sayilar = new Map<string, number>();
    for (let z = 0; z < 1; z += 0.005) {
      const t = turSec(2, 15, [], "kamp", z, etkinlik);
      sayilar.set(t, (sayilar.get(t) ?? 0) + 1);
    }
    return sayilar;
  }
  const duz = turSay(undefined);
  const oyunda = turSay("oyun");
  const molada = turSay("serbest");
  const yemekte = turSay("yemek");
  iddia((oyunda.get("gozlem") ?? 0) > (duz.get("gozlem") ?? 0), "oyun saatinde gözlem ağırlığı artar");
  iddia((molada.get("yansima") ?? 0) > (duz.get("yansima") ?? 0), "molada yansıma ağırlığı artar");
  iddia((yemekte.get("tahmin") ?? 0) > (duz.get("tahmin") ?? 0), "yemekte tahmin ağırlığı artar");
  const dogada = (() => {
    const sayilar = new Map<string, number>();
    for (let z = 0; z < 1; z += 0.005) {
      const t = turSec(2, 7, [], "kamp", z, "doga");
      sayilar.set(t, (sayilar.get(t) ?? 0) + 1);
    }
    return sayilar;
  })();
  const dogasiz = (() => {
    const sayilar = new Map<string, number>();
    for (let z = 0; z < 1; z += 0.005) {
      const t = turSec(2, 7, [], "kamp", z);
      sayilar.set(t, (sayilar.get(t) ?? 0) + 1);
    }
    return sayilar;
  })();
  iddia((dogada.get("cesaret") ?? 0) > (dogasiz.get("cesaret") ?? 0), "trekking'de cesaret ağırlığı artar");

  // Sahne metinleri ve gece fısıltıları dolu
  iddia(ACILIS_ANONSU.length > 100, "açılış anonsu dolu");
  iddia(!!GECE_FISILTILARI[1] && !!GECE_FISILTILARI[2] && !GECE_FISILTILARI[3], "gece fısıltısı yalnız Gün 1 ve 2");
  iddia(
    geceYansimaMetni(1, "Emre")?.includes("Emre") === true &&
      geceYansimaMetni(2, "Emre") !== null &&
      geceYansimaMetni(3, "Emre") === null,
    "gece yansıma metni Gün 1-2'de kişisel, Gün 3'te yok"
  );
  const aynaAni = aynaAniMetni({ gozlemSayisi: 412, teslimSayisi: 96, fieroAdlari: ["Ali", "Ayşe"] });
  iddia(aynaAni.includes("412") && aynaAni.includes("96") && aynaAni.includes("Ali"), "Ayna Anı metni günün sayılarını içerir");
  const aynaAniBos = aynaAniMetni({ gozlemSayisi: 0, teslimSayisi: 0, fieroAdlari: [] });
  iddia(!aynaAniBos.includes("undefined") && aynaAniBos.length > 50, "Ayna Anı fiero'suz da düzgün");
  console.log("  Sapanca akışı: 23 madde, sahne sessizliği, senkron ve sabah pencereleri doğrulandı");
}

// ---------------------------------------------------------------
console.log("\n■ 9) FAZ A AKIŞ SIRASI — kamp öncesi onboarding kapıları");
// ---------------------------------------------------------------
{
  // Tüm pencereler açık, kişi sıfırdan başlıyor: her aşamada doğru sonraki adım.
  const taban: AkisDurum = {
    sesVar: false,
    team: null,
    campUnlocked: false,
    pusulaTamam: false,
    hedefTamam: false,
    ofTamam: false,
    oyunSecimiAcik: true,
    pusulaAcik: true,
    onFarkindalikAcik: true,
    kampIciHedefKapisi: false,
  };

  // 1) Ses ritüeli her şeyden önce gelir.
  iddia(kampOncesiAdim(taban).tip === "rituel", "ses kaydı yokken ritüel gösterilir");

  // 2) Ses bitti → oyun seçimi (grup yok).
  const sesli = { ...taban, sesVar: true };
  const a2 = kampOncesiAdim(sesli);
  iddia(a2.tip === "yonlendir" && a2.yol === "/oyun-secimi", "ses sonrası oyun seçimine gider");

  // 3) Grup atandı → pusula.
  const gruplu = { ...sesli, team: "Kartallar" };
  const a3 = kampOncesiAdim(gruplu);
  iddia(a3.tip === "yonlendir" && a3.yol === "/pusula", "grup sonrası pusulaya gider");

  // 3b) ★ KRİTİK: pusula (neden keşfi) biter bitmez HEDEF gelir — ön farkındalıktan ÖNCE.
  const pusulali = { ...gruplu, pusulaTamam: true };
  const a3b = kampOncesiAdim(pusulali);
  iddia(
    a3b.tip === "yonlendir" && a3b.yol === "/hedef",
    "pusula biter bitmez hedefe gider (neden keşfinden hemen sonra)"
  );

  // 4) Hedef mühürlendi → ön farkındalık.
  const hedefli = { ...pusulali, hedefTamam: true };
  const a4 = kampOncesiAdim(hedefli);
  iddia(
    a4.tip === "yonlendir" && a4.yol === "/on-farkindalik",
    "hedef sonrası ön farkındalığa gider"
  );

  // 5) Ön farkındalık da bitti ama fiziksel giriş yok → mühür kapısı (/pusula hub).
  const ofBitti = { ...hedefli, ofTamam: true };
  const a5 = kampOncesiAdim(ofBitti);
  iddia(
    a5.tip === "yonlendir" && a5.yol === "/pusula",
    "her şey bitti ama kamp açılmadıysa mühür kapısında (/pusula) bekler"
  );

  // 6) Fiziksel giriş yapıldı → kamp öncesi kapılar düşer, ana akışa devam.
  const kampta = { ...ofBitti, campUnlocked: true };
  iddia(kampOncesiAdim(kampta).tip === "devam", "kampa girince ana akışa devam eder");

  // 6b) Kamp içi hedef penceresi açıksa kampa girmiş kişi hedefe yönlenir.
  const kamptaHedef = { ...kampta, hedefTamam: false, kampIciHedefKapisi: true };
  const a6b = kampOncesiAdim(kamptaHedef);
  iddia(
    a6b.tip === "yonlendir" && a6b.yol === "/hedef",
    "kamp içi hedef penceresi açıkken hedefe yönlenir"
  );

  // İZOLASYON: pencereler kapalıyken kamp öncesi kapılar kişiyi tutmaz.
  const pencerelerKapali: AkisDurum = {
    ...taban,
    sesVar: true,
    team: "Kartallar",
    oyunSecimiAcik: false,
    pusulaAcik: false,
    onFarkindalikAcik: false,
  };
  iddia(
    kampOncesiAdim(pencerelerKapali).tip === "devam",
    "tüm pencereler kapalıyken kamp öncesi kapı yok"
  );

  // 3b bağımsızlığı: pusula tamamsa (bir önceki oturumdan) admin bayrağı kapalı
  // olsa bile hedef bitene dek hedefe götürür — neden→hedef köprüsü kopmasın.
  const bayraksizPusula = {
    ...pencerelerKapali,
    pusulaTamam: true,
    hedefTamam: false,
  };
  const a3bBayraksiz = kampOncesiAdim(bayraksizPusula);
  iddia(
    a3bBayraksiz.tip === "yonlendir" && a3bBayraksiz.yol === "/hedef",
    "pusula tamamsa hedef, pusula_acik bayrağından bağımsız devreye girer"
  );

  // Kamp açıldıysa pusula yarım bile olsa kamp öncesi kapı kişiyi geri çekmez.
  const yarimAmaKampta: AkisDurum = {
    ...taban,
    sesVar: true,
    team: "Kartallar",
    campUnlocked: true,
    pusulaTamam: false,
  };
  iddia(
    kampOncesiAdim(yarimAmaKampta).tip === "devam",
    "kamp açıldıysa yarım pusula kişiyi geri çekmez"
  );

  console.log("  Akış sırası: ses → oyun → pusula → HEDEF → ön farkındalık → mühür → kamp doğrulandı");
}

// ---------------------------------------------------------------
console.log("\n■ 10) KARİYER PLANI MATEMATİĞİ — hedef somutlaştırma");
// ---------------------------------------------------------------
{
  // Geçersiz girdiler null döner (kişiye asla bozuk plan gösterilmez).
  iddia(kariyerPlaniHesapla(-1, 6, 5, "x") === null, "negatif rütbe indeksi → null");
  iddia(
    kariyerPlaniHesapla(KARIYER_BASAMAKLARI.length, 6, 5, "x") === null,
    "aralık dışı rütbe indeksi → null"
  );
  iddia(kariyerPlaniHesapla(5, 0, 5, "x") === null, "sıfır süre → null");
  iddia(kariyerPlaniHesapla(5, 6, 0, "x") === null, "sıfır günlük saat → null");

  // Tüm rütbe × süre × saat kombinasyonları geçerli plan üretir + değişmezler tutar.
  let kombinasyon = 0;
  for (let i = 0; i < KARIYER_BASAMAKLARI.length; i++) {
    for (const s of SURE_SECENEKLERI) {
      for (const g of GUNLUK_SAAT_SECENEKLERI) {
        const p = kariyerPlaniHesapla(i, s.ay, g.gunluk, g.etiket);
        kombinasyon++;
        if (!p) {
          iddia(false, `plan üretilemedi: rütbe ${i}, ${s.ay} ay, ${g.gunluk} saat`);
          continue;
        }
        // Hedef rütbe doğru basamak.
        iddia(p.rutbe === KARIYER_BASAMAKLARI[i].ad, `rütbe adı eşleşir (${i})`);
        // Son kilometre taşı her zaman hedefin kendisidir ve süresi tam sureAy.
        const son = p.kilometreTaslari[p.kilometreTaslari.length - 1];
        iddia(
          son.rutbe === KARIYER_BASAMAKLARI[i].ad && son.ay === s.ay,
          `son kilometre taşı hedef + sureAy (${i}, ${s.ay}ay)`
        );
        // Ara hedef sayısı: alt basamak sayısına göre (0→1, 1→2, ≥2→3).
        const beklenenTas = Math.min(3, 1 + Math.min(2, i));
        iddia(
          p.kilometreTaslari.length === beklenenTas,
          `kilometre taşı sayısı doğru (rütbe ${i}: ${p.kilometreTaslari.length}=${beklenenTas})`
        );
        // Kilometre taşı ayları azalmayan sırada (geriye giden hedef olmaz).
        let monoton = true;
        for (let k = 1; k < p.kilometreTaslari.length; k++) {
          if (p.kilometreTaslari[k].ay < p.kilometreTaslari[k - 1].ay) monoton = false;
        }
        iddia(monoton, `kilometre taşı ayları azalmaz (rütbe ${i}, ${s.ay}ay)`);
        // Türetilmiş alanlar tutarlı.
        iddia(p.haftalikSaat === Math.round(g.gunluk * 7), `haftalık saat = günlük×7 (${i})`);
        iddia(p.gelir === KARIYER_BASAMAKLARI[i].ortalama, `gelir ortalamadan gelir (${i})`);
        iddia(p.toplamPara > 0 && p.saatlikKazanc > 0, `yatırım ve saatlik kazanç pozitif (${i})`);
      }
    }
  }

  // Bilinen değer: Diamond (index 9), 6 ay, günde 5 saat.
  const d = kariyerPlaniHesapla(9, 6, 5, "Günde 5+ saat");
  iddia(!!d, "Diamond planı üretilir");
  if (d) {
    iddia(d.haftalikSaat === 35, "Diamond: haftalık 35 saat (5×7)");
    iddia(d.toplamSaat === Math.round(35 * 6 * 4.3), "Diamond: toplam saat = round(35×6×4.3)");
    iddia(d.kilometreTaslari.length === 3, "Diamond: 3 kilometre taşı (iki alt basamak + hedef)");
    iddia(
      d.kilometreTaslari[0].rutbe === KARIYER_BASAMAKLARI[7].ad &&
        d.kilometreTaslari[1].rutbe === KARIYER_BASAMAKLARI[8].ad,
      "Diamond: ara hedefler hemen alttaki iki basamak"
    );
    iddia(d.gelirArti === false, "Diamond: gelir taban değil (kesin aralık)");
  }

  // İlk basamak (index 0): ara hedef yok, tek kilometre taşı (hedefin kendisi).
  const ilk = kariyerPlaniHesapla(0, 3, 2, "Günde 2 saat");
  iddia(!!ilk && ilk.kilometreTaslari.length === 1, "ilk basamak: tek kilometre taşı");

  // Taban-değerli zirve (Presidential Diamond): arti bayrağı taşınır.
  const zirve = kariyerPlaniHesapla(KARIYER_BASAMAKLARI.length - 1, 12, 5, "Günde 5+ saat");
  iddia(!!zirve && zirve.gelirArti === true, "zirve rütbe: gelir taban değer (+) olarak işaretli");

  console.log(`  Kariyer planı: ${kombinasyon} kombinasyon + sınır/bilinen değerler doğrulandı`);
}

// ---------------------------------------------------------------
console.log("\n■ 11) FAZ B — SÖZ TAKİBİ & DÜRTME ESKALASYONU");
{
  const sabitBugun = "2026-06-21";
  const gunOnce = (n: number) =>
    bugunTr(new Date(Date.parse(sabitBugun) - n * 86_400_000));

  // takipDurumHesapla — boş geçmiş
  const bos = takipDurumHesapla([], sabitBugun);
  iddia(bos.seri === 0, "boş: seri 0");
  iddia(bos.toplam === 0, "boş: toplam 0");
  iddia(bos.kacirilanGun === 999, "boş: hiç adım yok → 999");
  iddia(bos.bugunYapildi === null, "boş: bugün işaretsiz");
  iddia(bos.son14.length === 14, "son14 her zaman 14 gün");
  iddia(bos.son14[13].gun === sabitBugun, "son14 son elemanı bugün");
  iddia(bos.son14[0].gun === gunOnce(13), "son14 ilk elemanı 13 gün önce");

  // Kesintisiz 3 gün (bugün dahil)
  const seri3 = takipDurumHesapla(
    [0, 1, 2].map((n) => ({ gun: gunOnce(n), yapildi: true })),
    sabitBugun
  );
  iddia(seri3.seri === 3, "kesintisiz 3 gün → seri 3");
  iddia(seri3.kacirilanGun === 0, "bugün yapıldı → kaçırma 0");
  iddia(seri3.bugunYapildi === true, "bugün yapıldı işareti");

  // Bugün işaretsiz ama dün+evvelsi yapıldı → seri kırılmaz
  const dunden = takipDurumHesapla(
    [1, 2].map((n) => ({ gun: gunOnce(n), yapildi: true })),
    sabitBugun
  );
  iddia(dunden.seri === 2, "bugün boş, dün+evvel yapıldı → seri 2 (kırılmaz)");
  iddia(dunden.kacirilanGun === 1, "son adım dün → kaçırma 1");
  iddia(dunden.bugunYapildi === null, "bugün henüz işaretsiz");

  // Araya 'yapılmadı' girince seri kırılır
  const kirik = takipDurumHesapla(
    [
      { gun: gunOnce(0), yapildi: true },
      { gun: gunOnce(1), yapildi: false },
      { gun: gunOnce(2), yapildi: true },
    ],
    sabitBugun
  );
  iddia(kirik.seri === 1, "dün 'yapılmadı' → seri bugünde durur (1)");
  iddia(kirik.toplam === 2, "toplam yalnız yapıldı günleri sayar (2)");

  // 5 gün sessizlik
  const sessiz = takipDurumHesapla([{ gun: gunOnce(5), yapildi: true }], sabitBugun);
  iddia(sessiz.kacirilanGun === 5, "son adım 5 gün önce → kaçırma 5");
  iddia(sessiz.seri === 0, "5 gün sessizlik → seri 0");

  // eskalasyonKarar — eşikler ve throttle
  const simdi = Date.parse("2026-06-21T12:00:00Z");
  const saatOnce = (h: number) => new Date(simdi - h * 3_600_000).toISOString();

  iddia(
    !eskalasyonKarar(0, null, null, simdi).kisiDurt &&
      !eskalasyonKarar(1, null, null, simdi).kisiDurt,
    "0-1 gün kaçırma → dürtme yok (eşik 2)"
  );
  const k2 = eskalasyonKarar(2, null, null, simdi);
  iddia(k2.kisiDurt && !k2.tanikUyar, "2 gün → kişi dürt, şahit sus");
  const k3 = eskalasyonKarar(3, null, null, simdi);
  iddia(k3.kisiDurt && !k3.tanikUyar, "3 gün → kişi dürt, şahit hâlâ sus");
  const k4 = eskalasyonKarar(4, null, null, simdi);
  iddia(k4.kisiDurt && k4.tanikUyar, "4 gün → hem kişi hem şahit");

  // Throttle: kişi son 20 saatte dürtüldüyse tekrar dürtülmez
  const durtuldu = eskalasyonKarar(4, saatOnce(10), null, simdi);
  iddia(!durtuldu.kisiDurt, "10 saat önce dürtüldü → tekrar dürtme yok");
  iddia(durtuldu.tanikUyar, "kişi throttle'da olsa da şahit uyarısı bağımsız");
  const tekrar = eskalasyonKarar(4, saatOnce(21), null, simdi);
  iddia(tekrar.kisiDurt, "21 saat geçti → yeniden dürtülebilir");

  // Throttle: şahitler son 44 saatte uyarıldıysa tekrar uyarılmaz
  const tanikSessiz = eskalasyonKarar(5, null, saatOnce(30), simdi);
  iddia(!tanikSessiz.tanikUyar, "şahitler 30 saat önce uyarıldı → tekrar yok");
  const tanikTekrar = eskalasyonKarar(5, null, saatOnce(45), simdi);
  iddia(tanikTekrar.tanikUyar, "45 saat geçti → şahitler yeniden uyarılır");

  // Throttle sabitleri beklenen pencerelerde
  iddia(DURTME_THROTTLE_MS === 20 * 3_600_000, "kişi throttle = 20 saat");
  iddia(TANIK_THROTTLE_MS === 44 * 3_600_000, "şahit throttle = 44 saat");

  console.log("  Faz B: takip serisi + kaçırma + eskalasyon eşik/throttle doğrulandı");
}

// ---------------------------------------------------------------
// BÖLÜM 12 — OV BÜYÜME SİMÜLASYONU (kariyer.ts saf fonksiyonları)
{
  console.log("\n── Bölüm 12: OV büyüme simülasyonu ──");

  // ovSimulasyonu: bileşik büyüme formülü OV(ay) = OV₀ × (1+g)^ay
  iddia(ovSimulasyonu(1000, 0, 0.2) === 1000, "0 ay → OV değişmez");
  iddia(ovSimulasyonu(1000, 1, 0.2) === 1200, "1 ay %20 büyüme → 1200");
  iddia(ovSimulasyonu(1000, 2, 0.2) === 1440, "2 ay %20 büyüme → 1440");
  iddia(ovSimulasyonu(1000, 1, 0.3) === 1300, "1 ay %30 büyüme → 1300");
  iddia(ovSimulasyonu(1000, 1, 0.4) === 1400, "1 ay %40 büyüme → 1400");
  iddia(ovSimulasyonu(0, 5, 0.2) === 0, "OV₀=0 → sonuç sıfır");
  iddia(ovSimulasyonu(500, 3, 0.0) === 500, "%0 büyüme → OV sabit kalır");

  // Büyük değerler — yuvarlama kontrolü
  const ov12ay = ovSimulasyonu(2500, 12, 0.2);
  iddia(ov12ay > 2500, "12 ay %20 büyüme ile OV artar");
  iddia(ov12ay === Math.round(2500 * Math.pow(1.2, 12)), "12 ay %20 → bileşik formüle uygun");

  // gerekliTempo: (ovHedef/ov0)^(1/ay) - 1
  const tempo = gerekliTempo(1000, 5000, 12);
  iddia(tempo > 0, "gerekliTempo > 0 (büyüme lazım)");
  // Doğrulama: OV₀ × (1 + tempo)^ay ≈ ovHedef (yuvarlama var, tolerans ±5)
  const dogrulama = Math.round(1000 * Math.pow(1 + tempo, 12));
  iddia(Math.abs(dogrulama - 5000) <= 5, "gerekliTempo doğrulaması: hedefe ulaşır");
  iddia(gerekliTempo(1000, 500, 12) === 0, "ovHedef <= ov0 → tempo 0");
  iddia(gerekliTempo(0, 5000, 12) === 0, "ov0=0 → tempo 0");
  iddia(gerekliTempo(1000, 5000, 0) === 0, "ay=0 → tempo 0");

  // makuSure: ln(ovHedef/ov0) / ln(1.20), ceil
  const sure = makuSure(1000, 5000);
  iddia(sure > 0, "makuSure > 0");
  // 1000 × 1.2^n ≥ 5000 → n = ceil(ln(5) / ln(1.2)) = ceil(8.83) = 9
  iddia(sure === 9, "makuSure(1000→5000) = 9 ay");
  iddia(makuSure(1000, 1000) === 0, "ovHedef = ov0 → 0 ay");
  iddia(makuSure(1000, 500) === 0, "ovHedef < ov0 → 0 ay");
  iddia(makuSure(0, 5000) === 0, "ov0=0 → 0 ay");
  // Doğrulama: 9 ayda %20 ile 1000 → 5160 > 5000 ✓
  iddia(ovSimulasyonu(1000, 9, 0.2) >= 5000, "makuSure(1000→5000)=9 doğrulaması");
  iddia(ovSimulasyonu(1000, 8, 0.2) < 5000, "8 ay yetmez, 9 gerekli");

  // mevcutRutbeIndex: OV'ye göre kariyer basamağı
  iddia(mevcutRutbeIndex(0) === 0, "OV=0 → Brand Partner (index 0)");
  iddia(mevcutRutbeIndex(99) === 0, "OV=99 → Brand Partner");
  iddia(mevcutRutbeIndex(100) === 0, "OV=100 → Brand Partner eşiği");
  iddia(mevcutRutbeIndex(1000) === 1, "OV=1000 → Brand Builder");
  iddia(mevcutRutbeIndex(3000) === 2, "OV=3000 → Bronze");
  iddia(mevcutRutbeIndex(5000) === 3, "OV=5000 → Silver");
  iddia(mevcutRutbeIndex(10000) === 4, "OV=10000 → Gold");
  iddia(mevcutRutbeIndex(125000) === 9, "OV=125000 → Diamond");
  iddia(mevcutRutbeIndex(1000000) === 13, "OV=1000000 → Presidential Diamond");
  iddia(mevcutRutbeIndex(999999) === 12, "OV=999999 → 3 Star Diamond");

  // simulasyonMilestonelari: HER ay (1..süre), sıralı, tekrarsız
  const ms12 = simulasyonMilestonelari(12);
  iddia(ms12.length === 12, "12 ay → her ay (12 satır)");
  iddia(ms12[0] === 1 && ms12[ms12.length - 1] === 12, "1..12 sıralı");
  iddia(new Set(ms12).size === ms12.length, "aylar tekrarsız");
  const ms1 = simulasyonMilestonelari(1);
  iddia(ms1.length === 1 && ms1[0] === 1, "1 ay → tek satır (1)");

  // HBB (Hızlı Başlangıç) rakam bütünlüğü — para; her ay bonus+ortalama=toplam
  iddia(HBB_AYLAR.length === 3, "HBB: 3 ay (Bronze/Silver/Gold)");
  for (const a of HBB_AYLAR) {
    iddia(a.bonus + a.ortalama === a.toplam, `HBB ${a.ay}. ay: bonus+ortalama=toplam`);
  }
  iddia(HBB_TOPLAM === 212000, "HBB toplam = 212.000");
  iddia(HBB_AYLAR.map((a) => a.rutbe).join() === "Bronze,Silver,Gold", "HBB rütbe sırası");

  // OV_SENARYOLAR içeriği doğrulama
  iddia(OV_SENARYOLAR.length === 3, "3 senaryo tanımlı");
  iddia(OV_SENARYOLAR[0].buyume === 0.2, "1. senaryo %20");
  iddia(OV_SENARYOLAR[1].buyume === 0.3, "2. senaryo %30");
  iddia(OV_SENARYOLAR[2].buyume === 0.4, "3. senaryo %40");

  // KARIYER_BASAMAKLARI — OV/VOLL eklendi, 14 basamak
  iddia(KARIYER_BASAMAKLARI.length === 14, "14 kariyer basamağı var");
  iddia(KARIYER_BASAMAKLARI[0].ov === 100, "Brand Partner OV = 100");
  iddia(KARIYER_BASAMAKLARI[0].voll === null, "Brand Partner VOLL = null");
  iddia(KARIYER_BASAMAKLARI[2].ov === 3000, "Bronze OV = 3000");
  iddia(KARIYER_BASAMAKLARI[2].voll === 600, "Bronze VOLL = 600");
  iddia(KARIYER_BASAMAKLARI[13].ov === 1000000, "Presidential Diamond OV = 1000000");
  iddia(KARIYER_BASAMAKLARI[13].voll === 300000, "Presidential Diamond VOLL = 300000");
  // OV değerleri sıralı büyümeli (her basamak bir öncekinden büyük)
  for (let i = 1; i < KARIYER_BASAMAKLARI.length; i++) {
    iddia(
      KARIYER_BASAMAKLARI[i].ov > KARIYER_BASAMAKLARI[i - 1].ov,
      `OV sıralı: ${KARIYER_BASAMAKLARI[i - 1].ad} < ${KARIYER_BASAMAKLARI[i].ad}`
    );
  }

  console.log("  Bölüm 12: OV simülasyon matematiği doğrulandı");
}

// ---------------------------------------------------------------
// BÖLÜM 13 — GİRİŞ HIZ-SINIRI KURALI (paylaşımlı NAT IP'sine dayanıklılık)
{
  console.log("\n── Bölüm 13: Giriş hız-sınırı kuralı ──");

  // Sınır altı → kilit yok (meşru kamp kullanımı bu bölgede kalmalı)
  iddia(limitAsildiMi(0, 0) === false, "0 başarısız → kilit yok");
  iddia(
    limitAsildiMi(MAX_BASARISIZ_IP - 1, 0) === false,
    "per-IP eşiğin 1 altı → kilit yok"
  );
  iddia(
    limitAsildiMi(0, MAX_BASARISIZ_GLOBAL - 1) === false,
    "global eşiğin 1 altı → kilit yok"
  );

  // Eşikte/üstünde → kilit (brute-force yanlış-deneme tarafında durdurulur)
  iddia(limitAsildiMi(MAX_BASARISIZ_IP, 0) === true, "per-IP eşik → kilit");
  iddia(
    limitAsildiMi(MAX_BASARISIZ_IP + 5, 0) === true,
    "per-IP eşik üstü → kilit"
  );
  iddia(
    limitAsildiMi(0, MAX_BASARISIZ_GLOBAL) === true,
    "global eşik → kilit"
  );

  // KAMP SENARYOSU: 100 kişilik kamp tek paylaşımlı IP. Eski global eşik (100)
  // bu ölçekte kolayca dolardı; yeni tavan kampın doğal başarısızlık gürültüsünün
  // çok üstünde olmalı ki kamp kendini kilitlemesin.
  iddia(
    MAX_BASARISIZ_GLOBAL >= 1000,
    "global tavan kamp ölçeğinin (100 kişi) çok üstünde"
  );
  // 100 kişiden ~her biri pencere içinde 1 kez yanlış yazsa bile (=100 başarısız)
  // sistem global olarak kilitlenmemeli.
  iddia(
    limitAsildiMi(0, 100) === false,
    "100 kişi × 1 yanlış → global kilit YOK (kamp güvenli)"
  );
  // Ama tek IP'den 60+ yanlış (otomatik tahmin) per-IP tarafında durur.
  iddia(
    limitAsildiMi(60, 100) === true,
    "tek IP 60 yanlış → per-IP durur (brute-force korunur)"
  );

  console.log("  Bölüm 13: hız-sınırı kuralı (NAT dayanıklılığı) doğrulandı");
}

// ---------------------------------------------------------------
// BÖLÜM 14 — RAPOR GÜVEN EŞİĞİ (min. değerlendiren / sınırlı yansıma)
{
  console.log("\n── Bölüm 14: Rapor güven eşiği ──");

  iddia(MIN_DEGERLENDIREN === 4, "min. değerlendiren eşiği = 4 (2 gölge + 2 açık)");

  // Eşik altı → düşük güven (sınırlı yansıma uyarısı)
  iddia(dusukGuvenMi(0) === true, "0 değerlendiren → düşük güven (yalnız öz)");
  iddia(dusukGuvenMi(1) === true, "1 değerlendiren → düşük güven");
  iddia(dusukGuvenMi(3) === true, "3 değerlendiren → düşük güven (eşik altı)");

  // Eşik ve üstü → güvenli (tam yansıma)
  iddia(dusukGuvenMi(4) === false, "4 değerlendiren → güven eşiği karşılandı");
  iddia(dusukGuvenMi(8) === false, "8 değerlendiren → güvenli");

  console.log("  Bölüm 14: rapor güven eşiği (zarif ele alma) doğrulandı");
}

// ---------------------------------------------------------------
// BÖLÜM 15 — WHATSAPP ŞABLONLARI (Meta onay kuralları + değişken üretimi)
{
  console.log("\n── Bölüm 15: WhatsApp şablonları ──");

  // İlk ad çıkarımı (sıcak hitap)
  iddia(ilkAd("Ayşe Yılmaz") === "Ayşe", "ilkAd: çok kelimeli addan ilk ad");
  iddia(ilkAd("  Mehmet  ") === "Mehmet", "ilkAd: baştaki/sondaki boşluk temizlenir");
  iddia(ilkAd("Elif") === "Elif", "ilkAd: tek kelime aynen döner");

  // Meta onay kuralları — her şablon gövdesi için
  const degiskenSay = (g: string) => (g.match(/\{\{\d+\}\}/g) ?? []).length;
  for (const s of WA_SABLONLAR) {
    const g = s.govde.trim();
    iddia(!/^\{\{\d+\}\}/.test(g), `${s.anahtar}: gövde değişkenle BAŞLAMIYOR`);
    iddia(!/\{\{\d+\}\}$/.test(g), `${s.anahtar}: gövde değişkenle BİTMİYOR`);
    iddia(!/\{\{\d+\}\}\s*\{\{\d+\}\}/.test(g), `${s.anahtar}: yan yana değişken yok`);

    // Değişkenler 1'den başlayıp atlamadan sıralı (gövde + buton url birlikte)
    const tumMetin = g + (s.buton ? ` ${s.buton.url}` : "");
    const numaralar = [...tumMetin.matchAll(/\{\{(\d+)\}\}/g)].map((m) => Number(m[1]));
    const tekil = [...new Set(numaralar)].sort((a, b) => a - b);
    iddia(
      tekil.every((v, i) => v === i + 1),
      `${s.anahtar}: değişkenler 1..n sıralı (atlamasız)`
    );

    // Tüm gövde değişkenlerinin örnek değeri var (CTA/medya onayı için şart)
    for (let i = 1; i <= degiskenSay(g); i++) {
      iddia(!!s.ornek[String(i)], `${s.anahtar}: {{${i}}} için örnek değer var`);
    }
  }

  // Değişken üretimi — giriş/ödev: ad + kod; duyuru: ad + serbest mesaj
  const giris = sablonBul("giris")!;
  const gd = degiskenleriUret(giris, { ad: "Ayşe Yılmaz", kod: "427813" });
  iddia(gd["1"] === "Ayşe" && gd["2"] === "427813", "giris: değişkenler {1:ilkAd, 2:kod}");

  const duyuru = sablonBul("duyuru")!;
  const dd = degiskenleriUret(duyuru, { ad: "Mehmet Demir", kod: "111111" }, "Yarın 09.00 salon");
  iddia(dd["1"] === "Mehmet" && dd["2"] === "Yarın 09.00 salon", "duyuru: {1:ilkAd, 2:mesaj}");

  // Önizleme: yer tutucular dolar, buton etiketi görünür
  const onz = onizleme(giris, gd);
  iddia(onz.includes("Ayşe"), "önizleme: ad dolduruldu");
  iddia(onz.includes(giris.buton!.baslik), "önizleme: buton etiketi görünüyor");
  iddia(!onz.includes("{{"), "önizleme: çözülmemiş yer tutucu kalmadı");
  // duyuru gövdesinde {{2}} var → serbest mesaj önizlemede görünür
  const donz = onizleme(duyuru, dd);
  iddia(donz.includes("Yarın 09.00 salon"), "önizleme: serbest mesaj dolduruldu");

  // Twilio tipleri: butonlu → call-to-action + text yedeği; duyuru → salt text
  const tip = twilioTipleri(giris) as Record<string, unknown>;
  iddia("twilio/call-to-action" in tip && "twilio/text" in tip, "giris: CTA + text yedeği üretildi");
  const dtip = twilioTipleri(duyuru) as Record<string, unknown>;
  iddia(!("twilio/call-to-action" in dtip) && "twilio/text" in dtip, "duyuru: salt metin tipi");

  // Adres normalizasyonu (saf regex; whatsapp.ts ile aynı kural)
  const adresGecerli = (tel: string) => /^\+[1-9]\d{7,14}$/.test(tel.trim());
  iddia(adresGecerli("+905001112233"), "telefon: E.164 geçerli");
  iddia(!adresGecerli("05001112233"), "telefon: önek yoksa geçersiz");
  iddia(!adresGecerli(""), "telefon: boş geçersiz");

  console.log("  Bölüm 15: WhatsApp şablon kuralları + değişken üretimi doğrulandı");
}

// ---------------------------------------------------------------
console.log("\n══════════ SONUÇ ══════════");
console.log(`  BAŞARILI iddia: ${basarili}`);
console.log(`  BAŞARISIZ iddia: ${basarisiz}`);
if (basarisiz > 0) {
  console.log("\nHatalar:");
  for (const h of hatalar) console.log(`  ✗ ${h}`);
  process.exit(1);
}
console.log("  ✔ Simülasyon temiz — davranış çekirdeği beklendiği gibi.\n");
