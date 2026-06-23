// Konuşmacı fotoğraflarının satır dağılımı.
// Dönüş: satır başına kişi sayısı. Üst sıra ≥ alt sıra; alt sıra ortalı çizilir.
export const fotoYerlesim = (n) => {
  if (n <= 0) return [];
  if (n <= 3) return [n];
  if (n === 4) return [2, 2];
  if (n === 5) return [3, 2];
  if (n === 6) return [3, 3];
  const ust = Math.ceil(n / 2);
  return [ust, n - ust];
};
