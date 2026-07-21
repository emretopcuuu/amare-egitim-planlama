// [E#37] HAFTALIK KOÇ ÖZETİ — kişinin bu haftaki gerçek verisinden DETERMİNİSTİK
// (AI'sız, anında, maliyetsiz) bir değerlendirme + gelecek haftanın TEK odağı.
// "Kodla hesapla, AI'dan geçme" ilkesi (radyo/kanıt deseniyle aynı): 150 kişiye
// haftalık AI çağrısı tik'te timeout/maliyet riski; kural tabanlı özet güvenilir.
// Hem /takip kartı hem (istenirse) push için tek doğruluk kaynağı.

export type HaftaVeri = {
  son7Isaret: number; // son 7 günde "adım attım" işareti
  seri: number;
  kacirilanGun: number;
  gorusme: number;
  kota: number | null;
  kayit: number;
};

export type KocNotu = { ozet: string; odak: string };

export function haftaKocNotu(v: HaftaVeri): KocNotu {
  // --- ÖZET: haftanın tonunu süreklilikten kur, sayıları ekle ---
  let ozet: string;
  if (v.son7Isaret >= 5) {
    ozet = `Güçlü bir hafta — ${v.son7Isaret}/7 gün sözünün peşindeydin.`;
  } else if (v.son7Isaret >= 3) {
    ozet = `İyi gidiyorsun — bu hafta ${v.son7Isaret} gün adım attın.`;
  } else if (v.son7Isaret >= 1) {
    ozet = `Bu hafta ${v.son7Isaret} gün işaretledin. Süreklilik seni büyütecek — küçük ama her gün.`;
  } else {
    ozet = "Bu hafta sessiz geçti — sorun değil. Yeni hafta temiz bir sayfa, tek işaretle dön.";
  }
  const parcalar: string[] = [];
  if (v.gorusme > 0) parcalar.push(`${v.gorusme} görüşme`);
  if (v.kayit > 0) parcalar.push(`${v.kayit} kayıt`);
  if (parcalar.length > 0) ozet += ` Bu hafta: ${parcalar.join(", ")}.`;

  // --- ODAK: en zayıf halkayı tek cümlede hedefle (öncelik sırasıyla) ---
  let odak: string;
  if (v.son7Isaret <= 2) {
    odak = "Gelecek hafta tek odağın: HER GÜN işaretle. Küçük de olsa bir adım — ritim her şeyden önce gelir.";
  } else if (v.kota != null && v.gorusme < v.kota) {
    odak = `Gelecek hafta tek odağın: görüşme sayını kotana taşı (${v.gorusme}/${v.kota}). Bir isim daha, bir arama daha.`;
  } else if (v.kayit === 0) {
    odak = "Gelecek hafta tek odağın: bir sonuca yaklaş — bir görüşmeyi kapanışa taşı, ilk kaydını hedefle.";
  } else {
    odak = "Gelecek hafta tek odağın: bu ritmi koru ve bir kişiye daha dokun — momentum artık senin tarafında.";
  }

  return { ozet, odak };
}
