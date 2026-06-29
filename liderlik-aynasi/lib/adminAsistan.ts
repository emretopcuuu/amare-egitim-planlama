import { kampGunleri, kampGunu } from "./kampProgrami";

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
  // Basit panel #1 — TEK-TIKLA EYLEM. Doluysa hero butonu kontrole gitmek yerine
  // işi doğrudan yapar (BasitEylem). Anahtar değerleri BasitEylem.planla ile eşleşir:
  // "pusula-ac" | "of-ac" | "rapor-ac" | "dalga-ac" | "dalga-kapat".
  eylem?: string;
  eylemDalga?: number; // dalga-ac/dalga-kapat için dalga numarası
  basari?: string; // #2 net başarı mesajı ("Pusula penceresi açıldı.")
  onay?: string; // #9 kritik eylemlerde sade dilli onay metni
};

export type AsistanDurum = {
  bugun: string; // Istanbul "YYYY-MM-DD"
  // Kampın 1. günü (Istanbul "YYYY-MM-DD"); yoksa sabit varsayılan takvim.
  baslangic?: string;
  katilimciSayisi: number;
  acikDalgaId: number | null;
  ozTamam: number; // açık değerlendirmede kendini puanlayan sayısı
  ozToplam: number; // toplam katılımcı (açık değerlendirme için payda)
  // Kamp Değerlendirmesi (id=1) açılıp kapandı mı — açma adımını tekrar önermemek için.
  degerlendirmeKapandi: boolean;
  raporlarAcik: boolean;
  sozAcik: boolean;
  // #3 Kamp öncesi funnel: Pusula penceresi açık mı + hazırlığı bitiren sayısı
  pusulaAcik: boolean;
  hazirTamam: number; // Ön Farkındalık'a kadar gelen (hazırlığı biten) sayı
  // #1 Ön Farkındalık penceresi açık mı (açık değilse aday o aşamaya giremez)
  onFarkAcik: boolean;
};

export function adminOnerisi(d: AsistanDurum): AdminOneri {
  // Kamp takvimi başlangıçtan türetilir (sabit değil) — bkz. AsistanDurum.baslangic.
  const [ILK_GUN, , SON_GUN] = kampGunleri(d.baslangic);
  const gun = kampGunu(d.bugun, d.baslangic);
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
        eylem: "pusula-ac",
        basari: "Pusula penceresi açıldı. Katılımcılar artık hazırlığa başlayabilir.",
      };
    }
    // Pusula açık ama Ön Farkındalık penceresi kapalı → adaylar o aşamaya
    // giremez. Pusulayı bitirenler birikmeye başladıysa ÖF'i açmayı öner.
    if (!d.onFarkAcik && d.hazirTamam < d.katilimciSayisi) {
      return {
        ikon: "🪞",
        baslik: "Ön Farkındalık'ı aç",
        aciklama:
          "Pusula penceresi açık. Sıradaki aşama Ön Farkındalık — bu pencereyi açmazsan adaylar oraya hiç giremez. Pusulayı bitirenler buraya geçsin.",
        butonEtiket: "Ön Farkındalık'ı Aç",
        href: "#onfark",
        vurgu: true,
        eylem: "of-ac",
        basari: "Ön Farkındalık penceresi açıldı. Pusulayı bitirenler buraya geçebilir.",
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
  // Yeni model: kamp içi tek değerlendirme var (Kamp Değerlendirmesi, id=1),
  // Gün 3 sabahı tören öncesi açılır. Gün 1-2'de değerlendirme yoktur.
  if (gun === 3) {
    // Değerlendirme açıksa: çoğunluk bitince kapat, değilse sürüyor.
    if (d.acikDalgaId === 1) {
      return cogunlukBitti
        ? {
            ikon: "👁",
            baslik: "Kapanış vakti — Değerlendirmeyi kapat",
            aciklama: `${d.ozTamam}/${d.ozToplam} değerlendirmeyi bitirdi. Kamp Değerlendirmesini kapat, aynaları açmaya hazırlan.`,
            butonEtiket: "Değerlendirmeyi Kapat",
            href: "#dalga",
            vurgu: true,
            eylem: "dalga-kapat",
            eylemDalga: 1,
            basari: "Kamp Değerlendirmesi kapandı. Şimdi Ayna Raporlarını açabilirsin.",
            onay: "Değerlendirmeyi kapatınca katılımcılar artık puan giremez. Geri alınabilir.",
          }
        : dalgaSuruyor(d);
    }
    // Henüz açılmadı (ve kapanmadı): Gün 3 sabahının ilk işi — değerlendirmeyi aç.
    if (!d.degerlendirmeKapandi && !d.raporlarAcik) {
      return {
        ikon: "🪞",
        baslik: "Kamp Değerlendirmesini aç",
        aciklama:
          "Tören öncesi son adım: katılımcılar birbirini liderlik özellikleriyle puanlasın. Pencere kapanınca Ayna Raporları hazır olur.",
        butonEtiket: "Değerlendirmeyi Aç",
        href: "#dalga",
        vurgu: true,
        eylem: "dalga-ac",
        eylemDalga: 1,
        basari: "Kamp Değerlendirmesi açıldı. Katılımcılar artık puanlamaya başlayabilir.",
      };
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
        eylem: "rapor-ac",
        basari: "Ayna Raporları açıldı. Herkesin telefonunda kişisel raporu beliriyor.",
        onay:
          "Bu, herkesin kişisel Ayna Raporunu TÜM katılımcılara açar — kapanışın 'wow' anı. Geri alınabilir.",
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

  // Gün 1-2: değerlendirme yok. Bu günler görev/sahne/oyun akışıdır; admin
  // canlı kampı yönetir, kapanış değerlendirmesi Gün 3 sabahına bırakılır.
  if (gun === 1 || gun === 2) {
    return {
      ikon: "🎬",
      baslik: `Gün ${gun} — kampı yönet`,
      aciklama:
        "Bugün görevler, sahne ve oyunlar akışı. Kapanış değerlendirmesi Gün 3 sabahı açılacak; şimdilik canlı akışı yönet.",
      butonEtiket: "Sahne Kumandası",
      href: "/admin/sahne-kumanda",
      vurgu: false,
    };
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

function dalgaSuruyor(d: AsistanDurum): AdminOneri {
  return {
    ikon: "⏳",
    baslik: "Değerlendirme sürüyor",
    aciklama: `${d.ozTamam}/${d.ozToplam} kendini puanladı. Eksik kalanları dürtebilirsin.`,
    butonEtiket: "Eksikleri Gör",
    href: "#ilerleme",
    vurgu: false,
  };
}
