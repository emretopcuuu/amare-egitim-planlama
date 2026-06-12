// DAVRANIŞ MİMARİSİ — Behavioral Blueprint'in saf çekirdeği.
// Bilinçli olarak 'server-only' DEĞİL ve DB'siz: hem sunucu hem istemci
// hem de simülasyon koşum dosyası aynı kuralları kullanır. Buradaki her
// fonksiyon deterministiktir (rastgelelik çağırana bırakılır).

// Göreli import bilinçli: simülasyon (tsx) takma ad çözmeden de koşabilsin
import { kampGunu, kampSenkronAnahtari, type EtkinlikTuru } from "./kampProgrami";

// ---------- 1) EUSTRESS MOTORU: akış kanalında kalmak ----------

export type Zorluk = 1 | 2 | 3;

export type Form = {
  /** Son puanlanan görevlerin AYNA puan ortalaması (veri yoksa null) */
  puanOrt: number | null;
  /** Son verilen görevlerde teslim oranı 0-1 (veri yoksa 1 varsay) */
  teslimOrani: number;
  /** Son görevlerden en az biri süresi dolarak mı kapandı? */
  sonSuresiDoldu: boolean;
};

/**
 * Akış kanalı kuralı: bunalan kişiye hafifletilmiş, sıkılan kişiye
 * iddialı görev. Eşikler simülasyonla doğrulanır (scripts/simulasyon.ts).
 */
export function zorlukSec(f: Form): Zorluk {
  const dusukForm =
    f.sonSuresiDoldu ||
    f.teslimOrani < 0.5 ||
    (f.puanOrt !== null && f.puanOrt < 5);
  if (dusukForm) return 1;
  const yuksekForm =
    f.puanOrt !== null && f.puanOrt >= 8 && f.teslimOrani >= 0.8;
  if (yuksekForm) return 3;
  return 2;
}

export const ZORLUK_ETIKETI: Record<Zorluk, string> = {
  1: "⚡ Isınma",
  2: "⚡⚡ Denge",
  3: "⚡⚡⚡ Meydan Okuma",
};

export const ZORLUK_YONERGESI: Record<Zorluk, string> = {
  1: "Hafif ve eğlenceli bir görev üret: küçük, garantili bir zafer hissi versin; özgüveni tamir etsin. Konfor alanının hemen kıyısında.",
  2: "Dengeli bir görev üret: hafif terleten ama başarılabilir — akış kanalının ortası.",
  3: "İddialı bir görev üret: kişiyi gözle görülür biçimde zorlasın, başarınca 'fiero' (yumruk havada zafer) hissi versin. Yine de 15-30 dakikada yapılabilir kalsın.",
};

// ---------- 3) MOMENTUM ENDEKSİ: sonuç değil, davranış eğilimi ----------

export type MomentumGirdisi = {
  /** Bu haftaki pencere */
  verilen: number; // verilen görev sayısı
  teslim: number; // yanıtlanan görev sayısı
  zamaninda: number; // son tarihten önce yanıtlanan
  puanlar: number[]; // bu haftaki AYNA puanları
  oncekiPuanlar: number[]; // önceki haftanın AYNA puanları
  degerlendirme: number; // bu hafta verdiği puan (rating) sayısı
};

export type MomentumSonucu = {
  skor: number; // 0-100
  bilesenler: { teslim: number; hiz: number; katilim: number; egilim: number };
};

const ort = (d: number[]) =>
  d.length ? d.reduce((a, b) => a + b, 0) / d.length : null;

/**
 * Skor = teslim(35) + hız(20) + katılım(25) + eğilim(20).
 * Ciroyu değil davranışı ölçer; veri yoksa bileşen nötr puanına düşer.
 */
export function momentumPuanla(g: MomentumGirdisi): MomentumSonucu {
  const teslim =
    g.verilen > 0 ? Math.min(1, g.teslim / g.verilen) * 35 : 18;
  const hiz = g.teslim > 0 ? Math.min(1, g.zamaninda / g.teslim) * 20 : 10;
  const katilim = Math.min(1, g.degerlendirme / 20) * 25;
  const bu = ort(g.puanlar);
  const onceki = ort(g.oncekiPuanlar);
  let egilim = 10;
  if (bu !== null && onceki !== null) {
    const fark = Math.max(-3, Math.min(3, bu - onceki)); // -3..+3
    egilim = ((fark + 3) / 6) * 20;
  } else if (bu !== null) {
    egilim = (bu / 10) * 20; // ilk hafta: mutlak seviye
  }
  const bilesenler = {
    teslim: Math.round(teslim),
    hiz: Math.round(hiz),
    katilim: Math.round(katilim),
    egilim: Math.round(egilim),
  };
  const skor = Math.max(
    0,
    Math.min(100, Math.round(teslim + hiz + katilim + egilim))
  );
  return { skor, bilesenler };
}

export function momentumMesaji(skor: number, oncekiSkor: number | null): string {
  const yon =
    oncekiSkor === null
      ? ""
      : skor > oncekiSkor
        ? " — ivmen yukarı ▲"
        : skor < oncekiSkor
          ? " — geçen haftanın altında ▼"
          : " — sabit ◆";
  if (skor >= 75) return `Momentum: ${skor}/100${yon}. Su senin ritminle dalgalanıyor.`;
  if (skor >= 45)
    return `Momentum: ${skor}/100${yon}. Sonuçları hemen göremeyebilirsin ama ben çabanın ivmesini ölçüyorum — ilerliyorsun.`;
  return `Momentum: ${skor}/100${yon}. Bu bir not değil, bir pusula. Küçük bir adım bile ibreyi oynatır — bugün bir tane seç.`;
}

// ---------- 5) KAYMA (CHURN) RADARI ----------

export type SistemModu = "kamp" | "yolculuk";

export type KaymaEsikleri = {
  nudgeSaat: number;
  nudgeTekrarSaat: number;
  alertSaat: number;
  alertTekrarSaat: number;
};

export const KAYMA_ESIKLERI: Record<SistemModu, KaymaEsikleri> = {
  kamp: { nudgeSaat: 6, nudgeTekrarSaat: 12, alertSaat: 12, alertTekrarSaat: 24 },
  yolculuk: { nudgeSaat: 48, nudgeTekrarSaat: 48, alertSaat: 96, alertTekrarSaat: 96 },
};

export type KaymaKarari = { nudge: boolean; alert: boolean };

/**
 * Sessizleşen katılımcı için karar: önce kişiye nazik dürtme, eşik
 * aşılırsa lidere uyarı. Tekrar süreleri bildirim yağmurunu engeller.
 */
export function kaymaKarari(
  sonEtkinlikMs: number | null,
  simdiMs: number,
  mod: SistemModu,
  sonNudgeMs: number | null,
  sonAlertMs: number | null
): KaymaKarari {
  if (sonEtkinlikMs === null) return { nudge: false, alert: false }; // hiç başlamamış: onboarding sorunu, kayma değil
  const e = KAYMA_ESIKLERI[mod];
  const sessizSaat = (simdiMs - sonEtkinlikMs) / 3_600_000;
  const nudge =
    sessizSaat >= e.nudgeSaat &&
    (sonNudgeMs === null ||
      (simdiMs - sonNudgeMs) / 3_600_000 >= e.nudgeTekrarSaat);
  const alert =
    sessizSaat >= e.alertSaat &&
    (sonAlertMs === null ||
      (simdiMs - sonAlertMs) / 3_600_000 >= e.alertTekrarSaat);
  return { nudge, alert };
}

// ---------- 6) 90 GÜNLÜK YOLCULUK FAZLARI ----------

export type YolculukFazi = {
  ad: string;
  baslangicGunu: number;
  bitisGunu: number;
  odak: string;
  yonerge: string;
  turAgirliklari: [string, number][];
};

export const YOLCULUK_FAZLARI: YolculukFazi[] = [
  {
    ad: "Kurulum ve Keşif",
    baslangicGunu: 1,
    bitisGunu: 3,
    odak: "Epic Meaning",
    yonerge:
      "Büyük amaç inşası: kişinin 'neden'ini netleştiren, kimlik ve aidiyet kuran hafif görevler. Satış değil anlam.",
    turAgirliklari: [
      ["yansima", 3],
      ["gozlem", 2],
    ],
  },
  {
    ad: "İlk Deneyimler",
    baslangicGunu: 4,
    bitisGunu: 10,
    odak: "Eustress",
    yonerge:
      "Gönüllü zorluk: küçük, net, başarısı garanti ilk adımlar. Aktivite ritmi kur; sonuç baskısı yok.",
    turAgirliklari: [
      ["gozlem", 3],
      ["cesaret", 2],
      ["yansima", 1],
    ],
  },
  {
    ad: "Aksiyona Giriş",
    baslangicGunu: 11,
    bitisGunu: 20,
    odak: "Fun Failure",
    yonerge:
      "Reddedilme korkusunu oyuna çevir: cesaret görevleri ve ilk gerçek temaslar. Her 'Hayır' veridir; kutla ve öğret.",
    turAgirliklari: [
      ["cesaret", 3],
      ["simulasyon", 2],
      ["gozlem", 1],
    ],
  },
  {
    ad: "Momentum",
    baslangicGunu: 21,
    bitisGunu: 30,
    odak: "Fiero",
    yonerge:
      "Zafer hissi: biriken küçük kazanımları görünür kıl, iddialı ama ulaşılabilir hedefler ver. İlerleme dilini kullan.",
    turAgirliklari: [
      ["cesaret", 3],
      ["yansima", 2],
      ["simulasyon", 1],
    ],
  },
  {
    ad: "Direnç",
    baslangicGunu: 31,
    bitisGunu: 60,
    odak: "İtiraz Ustalığı",
    yonerge:
      "Direnç simülasyonları ağırlıkta: itiraz karşılama provası, sosyal kanıt toplama, esnek iyimserlik.",
    turAgirliklari: [
      ["simulasyon", 3],
      ["cesaret", 2],
      ["yansima", 1],
    ],
  },
  {
    ad: "Bağımsızlık",
    baslangicGunu: 61,
    bitisGunu: 90,
    odak: "Liderlik",
    yonerge:
      "Öğreten lider: öğrendiğini bir başkasına aktarma, kendi sistemini kurma, ekip kurma görevleri. Epic Win'e hazırlık.",
    turAgirliklari: [
      ["yansima", 2],
      ["cesaret", 2],
      ["simulasyon", 2],
      ["gozlem", 1],
    ],
  },
];

export function fazBul(yolculukGunu: number): YolculukFazi {
  const g = Math.max(1, Math.min(90, yolculukGunu));
  return (
    YOLCULUK_FAZLARI.find((f) => g >= f.baslangicGunu && g <= f.bitisGunu) ??
    YOLCULUK_FAZLARI[YOLCULUK_FAZLARI.length - 1]
  );
}

export function yolculukGunuHesapla(baslangicIso: string, simdi: Date): number {
  return (
    Math.floor(
      (simdi.getTime() - new Date(baslangicIso).getTime()) / 86_400_000
    ) + 1
  );
}

// ---------- 8) SENKRON AN PENCERELERİ ----------

export type SenkronBaglam = {
  mod: SistemModu;
  /** Europe/Istanbul yerel gün adı: 0=Pazar … 3=Çarşamba */
  haftaninGunu: number;
  saat: number;
  dakika: number;
  /** YYYY-MM-DD (Istanbul) */
  tarih: string;
};

/**
 * Pencere açıksa benzersiz anahtar döner (settings kilidi bu anahtarla
 * kurulur — aynı pencere iki kez ateşlenemez); kapalıysa null.
 * Kamp: gerçek kamp tarihlerinde günün programına dikilmiş pencereler
 * (Gün 1 20:15 yemek · Gün 2 13:30 öğle · Gün 3 09:55 ara); kamp tarihi
 * dışında (prova) eski 12:00 ve 17:00 pencereleri. Yolculuk: Çarşamba 20:00-20:09.
 */
export function senkronAnahtari(b: SenkronBaglam): string | null {
  if (b.mod === "kamp") {
    // Kamp tarihindeyse YALNIZ programa dikilmiş pencere geçerli
    if (kampGunu(b.tarih)) return kampSenkronAnahtari(b.tarih, b.saat, b.dakika);
    if (b.dakika < 10 && (b.saat === 12 || b.saat === 17)) {
      return `senkron_${b.tarih}_${b.saat}`;
    }
    return null;
  }
  if (b.mod === "yolculuk" && b.haftaninGunu === 3 && b.saat === 20 && b.dakika < 10) {
    return `senkron_${b.tarih}_${b.saat}`;
  }
  return null;
}

/** API çağrısı düşerse senkron an asla boş kalmasın: hazır mikro görevler. */
export const SENKRON_YEDEKLERI: { baslik: string; govde: string }[] = [
  {
    baslik: "Sessiz Dakika",
    govde:
      "Şu anda herkes aynı şeyi yapıyor: 60 saniye sus, etrafına bak ve bugün seni en çok etkileyen kişinin adını bana yaz. Neden o?",
  },
  {
    baslik: "Üç Kelime",
    govde:
      "Herkesle aynı anda: şu anki halini ÜÇ kelimeyle yaz. Düşünme — ilk gelenler doğrudur.",
  },
  {
    baslik: "Bir Teşekkür",
    govde:
      "Şu anda tüm kamp bunu yapıyor: yanındaki ilk kişiye içten bir teşekkür et ve bana ne dediğini yaz.",
  },
  {
    baslik: "Omuz Omuza",
    govde:
      "Herkes aynı dakikada: az tanıdığın birinin yanına git, tek soru sor: 'Seni buraya ne getirdi?' Cevabın özünü yaz.",
  },
];

export function senkronYedekSec(anahtar: string): {
  baslik: string;
  govde: string;
} {
  let h = 0;
  for (let i = 0; i < anahtar.length; i++) h = (h * 31 + anahtar.charCodeAt(i)) >>> 0;
  return SENKRON_YEDEKLERI[h % SENKRON_YEDEKLERI.length];
}

// ---------- 4) KOMUTAN PANELİ EKSENLERİ (saf hesaplar) ----------

export type RadarGirdisi = {
  toplamKisi: number;
  aktif24s: number;
  verilen48s: number;
  teslim48s: number;
  caprazBag: number;
  toplamBag: number;
  beklenenPuan: number;
  girilenPuan: number;
  direncPuanlari: number[]; // cesaret+simulasyon AYNA puanları
};

export type RadarSonucu = {
  katilim: number;
  gorevMomentumu: number;
  aidiyet: number;
  tamamlama: number;
  retDirenci: number;
};

export function radarHesapla(g: RadarGirdisi): RadarSonucu {
  const oran = (pay: number, payda: number, bos: number) =>
    payda > 0 ? Math.round(Math.min(1, pay / payda) * 100) : bos;
  const direnc = ort(g.direncPuanlari);
  return {
    katilim: oran(g.aktif24s, g.toplamKisi, 0),
    gorevMomentumu: oran(g.teslim48s, g.verilen48s, 50),
    aidiyet: oran(g.caprazBag, g.toplamBag, 50),
    tamamlama: oran(g.girilenPuan, g.beklenenPuan, 0),
    retDirenci: direnc === null ? 50 : Math.round((direnc / 10) * 100),
  };
}

// ---------- GÖREV TÜRÜ SEÇİMİ (saf — simülasyon da kullanır) ----------

export const GOREV_TURLERI = [
  "gozlem",
  "cesaret",
  "yansima",
  "gizli",
  "tahmin",
  "simulasyon",
] as const;
export type GorevTuru = (typeof GOREV_TURLERI)[number];

/** Gün/saat/moda göre görev türü seçimi kodda yapılır — çeşitlilik garantisi.
 * Yolculuk modunda ağırlıkları aktif faz belirler; kampta o anki program
 * etkinliği (oyun/yemek/serbest/doğa) ağırlıkları kaydırır. zarDeger
 * verilirse deterministiktir (test/simülasyon); verilmezse Math.random. */
export function turSec(
  gun: number,
  saat: number,
  oncekiTurler: string[],
  mod: SistemModu = "kamp",
  zarDeger?: number,
  etkinlikTur?: EtkinlikTuru
): GorevTuru {
  const bugunGizliVar = oncekiTurler.includes("gizli");
  let agirliklar: [GorevTuru, number][];
  if (mod === "yolculuk") {
    const faz = fazBul(gun);
    agirliklar = faz.turAgirliklari.filter(([t]) =>
      (GOREV_TURLERI as readonly string[]).includes(t)
    ) as [GorevTuru, number][];
  } else {
    const taban: Record<GorevTuru, number> = {
      gozlem: 3,
      cesaret: gun >= 2 ? 3 : 2,
      yansima: saat >= 19 ? 3 : 1, // akşamları iç bakış
      gizli: bugunGizliVar || saat < 10 ? 0 : 1,
      tahmin: 1,
      simulasyon: gun >= 2 ? 1 : 0, // direnç provası 2. günden itibaren
    };
    // Program bağlamı: oyun saatinde gözlem/gizli, molada yansıma,
    // yemekte tahmin, doğada cesaret öne çıkar
    if (etkinlikTur === "oyun") {
      taban.gozlem += 2;
      if (taban.gizli > 0) taban.gizli += 1;
    } else if (etkinlikTur === "serbest") {
      taban.yansima += 2;
    } else if (etkinlikTur === "yemek" || etkinlikTur === "ara") {
      taban.tahmin += 2;
    } else if (etkinlikTur === "doga") {
      taban.cesaret += 2;
    }
    agirliklar = GOREV_TURLERI.map((t) => [t, taban[t]]);
  }
  const toplam = agirliklar.reduce((t, [, a]) => t + a, 0);
  let zar = (zarDeger ?? Math.random()) * toplam;
  for (const [tur, agirlik] of agirliklar) {
    zar -= agirlik;
    if (zar <= 0) return tur;
  }
  return "gozlem";
}
