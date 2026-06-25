// Konuşmacı fotoğraflarının satır dağılımı.
// Dönüş: satır başına kişi sayısı. Üst sıra ≥ alt sıra; alt sıra ortalı çizilir.
export const fotoYerlesim = (n) => {
  if (n <= 0) return [];
  if (n <= 3) return [n];
  if (n === 4) return [2, 2];
  if (n === 5) return [3, 2];
  if (n === 6) return [3, 3];
  // 7+ : satır başına en fazla 3, satırlar dengeli (üst sıra ≥ alt sıra)
  const satir = Math.ceil(n / 3);
  const taban = Math.floor(n / satir), fazla = n % satir;
  return Array.from({ length: satir }, (_, i) => taban + (i < fazla ? 1 : 0));
};
