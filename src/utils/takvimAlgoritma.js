/**
 * AMARE EĞİTİM TAKVİMİ OLUŞTURMA ALGORİTMASI
 * Python versiyonundan JavaScript'e çevrildi
 */

const SAATLER = ["08:00", "21:00", "22:00"];
const GUNLER = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma"];

// Eğitim kategorileri ve haftalık dağılım
export const EGITIM_KATEGORILERI = {
  "Hafta 1 - Motivasyon & Temel": [
    "Yeni başlangıç eğitimi",
    "Ürün eğitimi",
    "Network büyütme"
  ],
  "Hafta 2 - Aksiyon & Satış": [
    "Görüşme üretme",
    "İtiraz karşılama",
    "Hikâye anlatımı / Story selling",
    "Kapanış teknikleri"
  ],
  "Hafta 3 - Liderlik & Sistem": [
    "Liderlik",
    "Takım motivasyonu",
    "Haftalık aksiyon yönetimi",
    "Duygusal dayanıklılık"
  ],
  "Hafta 4 - Büyüme & Kariyer": [
    "Diamond'a giden yol",
    "Kariyer planlama",
    "Sosyal medya kullanımı",
    "Sahne / Sunum eğitimi"
  ]
};

/**
 * Mayıs 2026 günlerini oluştur
 */
export function mayis2026Gunleri() {
  const gunler = [];
  const mayis1 = new Date(2026, 4, 1); // 4 = Mayıs (0-indexed)
  
  for (let i = 0; i < 31; i++) {
    const gun = new Date(mayis1);
    gun.setDate(mayis1.getDate() + i);
    
    const gunAdi = gun.toLocaleDateString('tr-TR', { weekday: 'long' });
    const gunAdiCapitalized = gunAdi.charAt(0).toUpperCase() + gunAdi.slice(1);
    
    if (GUNLER.includes(gunAdiCapitalized)) {
      gunler.push({
        tarih: gun.toLocaleDateString('tr-TR'),
        gun: gunAdiCapitalized,
        hafta: Math.floor(i / 7) + 1,
        tarihObj: gun
      });
    }
  }
  
  return gunler;
}

/**
 * Deneyim puanı hesapla
 */
function deneyimPuani(deneyimText) {
  if (deneyimText.includes("birçok kez") || deneyimText.includes("5+")) {
    return 3;
  } else if (deneyimText.includes("birkaç kez") || deneyimText.includes("2-4")) {
    return 2;
  }
  return 1;
}

/**
 * Eğitimin hangi kategoriye ait olduğunu bul
 */
function egitimKategoriBul(egitimAdi) {
  for (const [kategori, egitimler] of Object.entries(EGITIM_KATEGORILERI)) {
    if (egitimler.includes(egitimAdi)) {
      return kategori;
    }
  }
  return "Diğer";
}

/**
 * Ana takvim oluşturma fonksiyonu
 */
export function takvimOlustur(egitmenler) {
  const mayisGunleri = mayis2026Gunleri();
  const takvim = [];
  const kullanilanEgitmenler = new Set();
  const gunEgitimSayisi = {};
  
  // Eğitmenleri deneyime göre sırala
  const siraliEgitmenler = [...egitmenler].sort((a, b) => {
    const aPoint = deneyimPuani(a.deneyim);
    const bPoint = deneyimPuani(b.deneyim);
    return bPoint - aPoint;
  });
  
  // Haftalara göre işle
  for (let hafta = 1; hafta <= 4; hafta++) {
    const haftaGunleri = mayisGunleri.filter(g => g.hafta === hafta);
    const haftaKategorileri = Object.keys(EGITIM_KATEGORILERI);
    const haftaKategorisi = haftaKategorileri[hafta - 1];
    const hedefEgitimler = EGITIM_KATEGORILERI[haftaKategorisi];
    
    let haftaEgitimSayisi = 0;
    const maxHaftalikEgitim = 3;
    
    for (const egitmen of siraliEgitmenler) {
      // Eğitmen zaten kullanıldı mı?
      if (kullanilanEgitmenler.has(egitmen.adSoyad)) {
        continue;
      }
      
      // Hafta kotası doldu mu?
      if (haftaEgitimSayisi >= maxHaftalikEgitim) {
        break;
      }
      
      // Eğitmenin vereceği eğitimler
      const egitmenEgitimleri = egitmen.egitimler;
      
      // Bu haftanın kategorisine uygun eğitim var mı?
      let uygunEgitim = egitmenEgitimleri.find(e => hedefEgitimler.includes(e));
      
      // Uygun eğitim yoksa, diğer eğitimlerden seç
      if (!uygunEgitim && egitmenEgitimleri.length > 0) {
        uygunEgitim = egitmenEgitimleri[0];
      }
      
      if (!uygunEgitim) {
        continue;
      }
      
      // Uygun gün ve saat bul
      let yerlestirildi = false;
      
      for (const gunData of haftaGunleri) {
        if (yerlestirildi) break;
        
        const gun = gunData.gun;
        const tarih = gunData.tarih;
        
        if (!egitmen.uygunGunler.includes(gun)) {
          continue;
        }
        
        // Bu günde kaç eğitim var?
        if ((gunEgitimSayisi[tarih] || 0) >= 2) {
          continue;
        }
        
        for (const saat of egitmen.uygunSaatler) {
          const slotKey = `${tarih}_${saat}`;
          
          // Slot boş mu?
          if (!takvim.some(t => t.slot === slotKey)) {
            // Yerleştir
            takvim.push({
              hafta,
              haftaAdi: haftaKategorisi,
              gun,
              tarih,
              saat,
              egitim: uygunEgitim,
              egitmen: egitmen.adSoyad,
              telefon: egitmen.telefon,
              email: egitmen.email,
              sure: egitmen.sureTercihi,
              deneyim: egitmen.deneyim,
              slot: slotKey,
              id: `egitim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            });
            
            kullanilanEgitmenler.add(egitmen.adSoyad);
            gunEgitimSayisi[tarih] = (gunEgitimSayisi[tarih] || 0) + 1;
            haftaEgitimSayisi++;
            yerlestirildi = true;
            break;
          }
        }
      }
    }
  }
  
  return takvim;
}

/**
 * Takvimi haftalara göre grupla
 */
export function takvimHaftalikGrupla(takvim) {
  const haftalar = {};
  
  for (let i = 1; i <= 4; i++) {
    haftalar[`Hafta ${i}`] = takvim.filter(t => t.hafta === i);
  }
  
  return haftalar;
}

/**
 * Manuel eğitim ekleme validasyonu
 */
export function manuelEgitimValidate(yeniEgitim, mevcutTakvim, egitmenler) {
  const errors = [];
  
  // 1. Aynı slot'ta başka eğitim var mı?
  const slotKey = `${yeniEgitim.tarih}_${yeniEgitim.saat}`;
  if (mevcutTakvim.some(t => t.slot === slotKey)) {
    errors.push("Bu tarih ve saatte başka bir eğitim var!");
  }
  
  // 2. Eğitmen zaten başka eğitim veriyor mu?
  if (mevcutTakvim.some(t => t.egitmen === yeniEgitim.egitmen)) {
    errors.push("Bu eğitmen zaten ayda 1 eğitim veriyor!");
  }
  
  // 3. Aynı günde 2'den fazla eğitim olmasın
  const ayniGunEgitimler = mevcutTakvim.filter(t => t.tarih === yeniEgitim.tarih);
  if (ayniGunEgitimler.length >= 2) {
    errors.push("Bu günde zaten 2 eğitim var!");
  }
  
  return errors;
}
