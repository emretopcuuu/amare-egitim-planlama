// EKİP SLOGANI — "İyisin devam 👍" (metin: lib/i18n/tr.ts tr.ortak.iyisinDevam).
// Sahada zaten kullanılan bir söz; kişi ilerledikçe (iyi puanlı görev, unvan
// atlaması) ARA ARA gösterilir — her yerde göstermek anlamını kaybettirir.
// Onboarding, kamp ve 90 gün boyunca aynı düşük-olasılıklı desenle çalışır;
// yeni bayrak/migration gerekmez (saf istemci mantığı, DB'ye dokunmaz).

// FNV-1a benzeri deterministik hash → 0..1 arası sözde-rastgele. Aynı seed
// (ör. görev id) her yenilemede AYNI sonucu verir — flicker/tutarsızlık olmaz.
function tohum(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

// seed sabit kaldığı sürece karar da sabit kalır. Varsayılan oran ~1/5 —
// yalnız iyi anların bir kısmında görünsün, "duvar kağıdı" olmasın.
export function iyisinDevamGoster(seed: string, oran = 0.2): boolean {
  return tohum(seed) < oran;
}
