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
