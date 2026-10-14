// Kategorisi girilmemiş eğitimler için başlıktan kategori türetir.
//
// Ölçüm (Eki 2026): 74 takvim kaydının 50'sinde kategori alanı BOŞ. Kategori
// filtresi bu yüzden yanıltıcıydı: "Liderlik" seçen kişi eğitimlerin çoğunun
// kaybolduğunu görüyor ve filtreyi bozuk sanıyordu.
//
// VERİYE DOKUNMAZ. Yalnız okuma anında, başlıkta geçen net anahtar kelimelerden
// türetir. Tahmin riskini düşürmek için yalnızca açık eşleşmeler var; başlık
// belirsizse ("One Team Özel Eğitim" gibi) kategori atanmaz, kayıt kategorisiz
// kalır. Türetilen kategori arayüzde "otomatik" olarak işaretlenir.
//
// Kalıcı çözüm kategorilerin admin tarafında girilmesidir; bu yalnızca
// mevcut veriyle filtreyi kullanılabilir kılar.

// Sıra önemli: ilk eşleşen kazanır, daha özel kalıplar üstte.
const KURALLAR = [
  [/VİZYON\s*GÜN/i, 'Vizyon Günü'],
  [/\bPANEL\b/i, 'Panel'],
  [/SAĞLIKLI\s*YAŞAM|\bSAĞLIK\b|BESLENME|DİYET/i, 'Sağlık'],
  [/KAZANÇ\s*PLAN|KOMİSYON|GELİR|FİNANS/i, 'Finansal Özgürlük'],
  [/PRESIDENTIAL|\bPD\s*1?0?\d|DIAMOND\s*YOLCULUĞ|LİDERLİK|LEADERSHIP/i, 'Liderlik'],
  [/ÜRÜN|HAPPY\s*JUICE|LANSMAN|AMARE\s*ÜRÜN/i, 'Ürün Eğitimi'],
  [/İTİRAZ|MAZERET|KAPANIŞ|LİSTE|DAVET|REKLAM|SUNUM|HİKAYE|ISINMA|TAKİP|SATIŞ/i, 'Satış'],
  [/BAŞLANGIÇ|BAŞLADIM|DOĞRU\s*BAŞLA|İLK\s*ADIM|GELİŞİM/i, 'Kişisel Gelişim'],
  [/BÜYÜK\s*DÜŞÜN|İNANÇ|MOTİVASYON|HEDEF|HAYAL/i, 'Motivasyon'],
];

// Başlıktan türet. Eşleşme yoksa '' döner (kategorisiz kalır).
export const kategoriTuret = (baslik) => {
  const b = String(baslik || '');
  if (!b.trim()) return '';
  for (const [kalip, ad] of KURALLAR) {
    if (kalip.test(b)) return ad;
  }
  return '';
};

// Kaydın görüntülenecek kategorisi: girilmiş değer önce gelir.
export const kategoriAl = (egitim) => {
  const girilmis = String(egitim?.kategori || '').trim();
  if (girilmis) return girilmis;
  return kategoriTuret(egitim?.egitim);
};

// Kategori girilmiş mi, yoksa başlıktan mı türedi? (rozet ipucu için)
export const kategoriOtomatikMi = (egitim) =>
  !String(egitim?.kategori || '').trim() && !!kategoriTuret(egitim?.egitim);

export default kategoriAl;
