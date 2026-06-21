import { KAMP_GUNLERI, kampGunu } from "./kampProgrami";

// #7 "Şimdi ne yapmalıyım?" — adminin o an basması gereken TEK adımı, kampın
// takvimine + sistemin durumuna bakarak öneren saf (yan etkisiz) karar motoru.
// Admin karar/çıkmaz yaşamasın, butonları yanlış sırada basmasın diye tek net iş.

export type AdminOneri = {
  ikon: string;
  baslik: string;
  aciklama: string;
  butonEtiket: string;
  href: string;
  // true ise kamp akışının kritik anı (kor/altın vurgu); false ise sakin bilgi.
  vurgu: boolean;
};

export type AsistanDurum = {
  bugun: string; // Istanbul "YYYY-MM-DD"
  katilimciSayisi: number;
  acikDalgaId: number | null;
  ozTamam: number; // açık dalgada kendini puanlayan sayısı
  ozToplam: number; // toplam katılımcı (açık dalga için payda)
  raporlarAcik: boolean;
  sozAcik: boolean;
  // #3 Kamp öncesi funnel: Pusula penceresi açık mı + hazırlığı bitiren sayısı
  pusulaAcik: boolean;
  hazirTamam: number; // Ön Farkındalık'a kadar gelen (hazırlığı biten) sayı
};

const ILK_GUN = KAMP_GUNLERI[0];
const SON_GUN = KAMP_GUNLERI[KAMP_GUNLERI.length - 1];

export function adminOnerisi(d: AsistanDurum): AdminOneri {
  const gun = kampGunu(d.bugun);
  const cogunlukBitti = d.ozToplam > 0 && d.ozTamam / d.ozToplam >= 0.8;

  // 1) KAMP ÖNCESİ — hazırlık hunisi (funnel'a bağlı: yükle → pencere aç →
  // hatırlat → QR). Operatör her aşamada tek net adımı görür.
  if (d.bugun < ILK_GUN) {
    if (d.katilimciSayisi === 0) {
      return {
        ikon: "📋",
        baslik: "Önce katılımcıları yükle",
        aciklama:
          "Kamp başlamadan katılımcı listesini (CSV) yükle; 6 haneli giriş kodları otomatik üretilir. Kurulum sihirbazı seni adım adım götürür.",
        butonEtiket: "Kurulum Sihirbazını Aç",
        href: "/admin/kurulum",
        vurgu: true,
      };
    }
    // Katılımcı var ama Pusula penceresi kapalı → hazırlık hunisini başlat.
    if (!d.pusulaAcik) {
      return {
        ikon: "🎯",
        baslik: "Pusula penceresini aç",
        aciklama: `${d.katilimciSayisi} katılımcı hazır. Pusula penceresini aç ki katılımcılar kamp öncesi hazırlığa (ses, pusula, ön farkındalık) başlasın.`,
        butonEtiket: "Pusula Penceresini Aç",
        href: "#fazsifir",
        vurgu: true,
      };
    }
    // Pencere açık: hazırlığı biten azsa hatırlatmaya yönlendir.
    const hazirOran = d.katilimciSayisi > 0 ? d.hazirTamam / d.katilimciSayisi : 0;
    if (hazirOran < 0.8) {
      return {
        ikon: "🔔",
        baslik: "Hazırlığı eksik olanları dürt",
        aciklama: `${d.hazirTamam}/${d.katilimciSayisi} kişi hazırlığını bitirdi. Eksik olanlara hatırlatma gönder — kampa hazır gelsinler.`,
        butonEtiket: "Hazırlık Hunisine Git",
        href: "#fazsifir",
        vurgu: false,
      };
    }
    return {
      ikon: "🖨️",
      baslik: "QR kartlarını yazdır",
      aciklama: `${d.katilimciSayisi} katılımcı hazır, hazırlık güçlü. Yaka kartı QR'larını yazdır, kamp gününe hazır ol.`,
      butonEtiket: "QR'ları Yazdır",
      href: "/admin/kurulum",
      vurgu: false,
    };
  }

  // 2) KAMP SONRASI — 90 günlük yolculuk
  if (d.bugun > SON_GUN) {
    return {
      ikon: "🌱",
      baslik: "90 günlük yolculuğu sür",
      aciklama:
        "Kamp bitti. Liderlerin momentumunu Komutan panelinden izle; gerekirse 90 gün davetlerini gönder.",
      butonEtiket: "Komutan Paneli",
      href: "/admin/komutan",
      vurgu: false,
    };
  }

  // 3) KAMP GÜNLERİ (gun: 1-3)
  if (gun === 3) {
    // Gün 3 finali: Dalga 3 → kapat → Ayna Raporları → Kapanış Sözü
    if (d.acikDalgaId === 3) {
      return cogunlukBitti
        ? {
            ikon: "👁",
            baslik: "Kapanış vakti — Dalga 3'ü kapat",
            aciklama: `${d.ozTamam}/${d.ozToplam} son dalgayı bitirdi. Dalga 3'ü kapat, aynaları açmaya hazırlan.`,
            butonEtiket: "Dalga 3'ü Kapat",
            href: "#dalga",
            vurgu: true,
          }
        : dalgaSuruyor(3, d);
    }
    if (!d.raporlarAcik) {
      return {
        ikon: "✨",
        baslik: "Ayna Raporlarını aç",
        aciklama:
          "Kapanış anı: herkesin kişisel Ayna Raporunu görünür yap. Asıl 'wow' anı budur.",
        butonEtiket: "Raporları Aç",
        href: "#ayna-ani",
        vurgu: true,
      };
    }
    if (!d.sozAcik) {
      return {
        ikon: "🤝",
        baslik: "Kapanış Sözünü aç",
        aciklama:
          "Son adım: liderler Temmuz kayıt ve Ağustos görüşme sözünü kendi sesleriyle versin.",
        butonEtiket: "Sözü Aç",
        href: "/admin/sozler",
        vurgu: true,
      };
    }
    return {
      ikon: "🎉",
      baslik: "Kapanış tamamlandı",
      aciklama:
        "Tüm kapanış adımları açık. Şimdi sahneyi yönet ve liderlerin sözlerini izle.",
      butonEtiket: "Sahne Kumandası",
      href: "/admin/sahne-kumanda",
      vurgu: false,
    };
  }

  // Gün 1-2: günün dalgası = gün numarası
  if (gun === 1 || gun === 2) {
    if (d.acikDalgaId === null) {
      return {
        ikon: "🌊",
        baslik: `Dalga ${gun}'i aç`,
        aciklama: `Gün ${gun}. Katılımcıların ${gun}. dalgayı doldurabilmesi için dalgayı aç.`,
        butonEtiket: `Dalga ${gun}'i Aç`,
        href: "#dalga",
        vurgu: true,
      };
    }
    if (cogunlukBitti) {
      return {
        ikon: "✅",
        baslik: `Çoğu Dalga ${d.acikDalgaId}'i bitirdi`,
        aciklama: `${d.ozTamam}/${d.ozToplam} kendini puanladı. Dalgayı kapatıp sonraki güne geçebilirsin.`,
        butonEtiket: "Dalgayı Kapat",
        href: "#dalga",
        vurgu: false,
      };
    }
    return dalgaSuruyor(d.acikDalgaId, d);
  }

  // Güvenli varsayılan (tarih kamp aralığında ama gün eşleşmedi — olası değil)
  return {
    ikon: "👁",
    baslik: "Kamp akışını izle",
    aciklama: "Sistemin nabzını kontrol et; sıradaki adım için ilerlemeyi takip et.",
    butonEtiket: "İlerlemeyi Gör",
    href: "#ilerleme",
    vurgu: false,
  };
}

function dalgaSuruyor(dalgaId: number, d: AsistanDurum): AdminOneri {
  return {
    ikon: "⏳",
    baslik: `Dalga ${dalgaId} sürüyor`,
    aciklama: `${d.ozTamam}/${d.ozToplam} kendini puanladı. Eksik kalanları dürtebilirsin.`,
    butonEtiket: "Eksikleri Gör",
    href: "#ilerleme",
    vurgu: false,
  };
}
