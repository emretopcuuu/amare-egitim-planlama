/* eslint-disable no-console */
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
console.log("\n══════════ SONUÇ ══════════");
console.log(`  BAŞARILI iddia: ${basarili}`);
console.log(`  BAŞARISIZ iddia: ${basarisiz}`);
if (basarisiz > 0) {
  console.log("\nHatalar:");
  for (const h of hatalar) console.log(`  ✗ ${h}`);
  process.exit(1);
}
console.log("  ✔ Simülasyon temiz — davranış çekirdeği beklendiği gibi.\n");
