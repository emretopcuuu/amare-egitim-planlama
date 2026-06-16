// Giriş sonrası dönüş hedefi doğrulaması: yalnız aynı-köken GÖRELİ yol kabul
// edilir. Mutlak URL ("//evil.com", "https://…") açık yönlendirme riski olduğu
// için reddedilir. Güvenli değilse null döner → çağıran varsayılana düşer.
export function guvenliNext(n: string | null | undefined): string | null {
  if (!n) return null;
  if (!n.startsWith("/") || n.startsWith("//")) return null;
  return n;
}
