// PLAN TAKVİMİ — 90 günlük oyun planının ay bazlı etiketleri. Ufuklar artık
// "10/40/90 gün" değil takvim ayları: içinde bulunulan ay, gelecek ay, ondan
// sonraki ay. Saf fonksiyon (server + client). Sayaçlar bugünden ilgili ayın
// SON gününe kalan gün sayısını verir — canlı geri sayım.

const AYLAR = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];

// now'dan `offset` ay sonraki ayın adı (0 = içinde bulunulan ay).
export function ayAdi(now: Date, offset: number): string {
  const m = ((now.getMonth() + offset) % 12 + 12) % 12;
  return AYLAR[m];
}

// Bugünden, (now + offset ay) ayının SON gününe kalan tam gün sayısı (>=0).
export function aySonunaGun(now: Date, offset: number): number {
  const hedefAySonu = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0);
  const bugun = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const gun = Math.round((hedefAySonu.getTime() - bugun.getTime()) / 86_400_000);
  return Math.max(0, gun);
}

// Söz adımının ufku → ay etiketi. Eski gün kodlarını (10/40/90) da destekler,
// böylece daha önce şekillenmiş sözler de doğru (ay bazlı) görünür.
export function ufukAyEtiket(ufuk: string, now: Date): string {
  if (ufuk === "ilk_72_saat" || ufuk === "72") return "İlk 72 Saat";
  if (ufuk === "kirk_gun" || ufuk === "40") return ayAdi(now, 1);
  if (ufuk === "doksan_gun" || ufuk === "90") return ayAdi(now, 2);
  return ayAdi(now, 0);
}
