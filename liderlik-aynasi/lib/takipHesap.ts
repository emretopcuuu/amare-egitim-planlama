// FAZ B — SÖZ TAKİBİ MATEMATİĞİ: tek doğruluk kaynağı (saf, DB'siz).
// `lib/sozTakip.ts` bu fonksiyonları DB satırlarıyla besler; uçtan uca
// simülasyon (scripts/simulasyon.ts) aynı fonksiyonları deterministik test
// eder. Seri/kaçırma matematiği ve eskalasyon eşikleri BURADA kilitlenir —
// "iki yerde iki ayrı doğruluk olmasın" (akis.ts ile aynı disiplin).
//
// server-only İÇERMEZ ki simülasyondan import edilebilsin.

// İstanbul yerel günü YYYY-MM-DD.
export function bugunTr(d = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(d);
}

// İki YYYY-MM-DD günü arasındaki tam gün farkı (a - b).
export function gunFarki(a: string, b: string): number {
  return Math.round((Date.parse(a) - Date.parse(b)) / 86_400_000);
}

export type TakipDurum = {
  bugunYapildi: boolean | null;
  seri: number; // bugüne kadar kesintisiz "yapıldı" günü (SERİ SİGORTASI dahil)
  toplam: number; // toplam yapıldı günü
  son14: { gun: string; yapildi: boolean | null }[];
  kacirilanGun: number; // son adımdan bu yana kaç gün geçti
  // [C#22] SERİ SİGORTASI: bu takvim ayında joker kullanıldı mı (tek kaçırılan
  // günü köprüleyip seriyi ayakta tuttu mu). false → bu ay hâlâ bir hakkın var.
  sigortaBuAyKullanildi: boolean;
};

// soz_takip satırlarından (gün, yapildi) takip durumunu çıkar. `bugun` İstanbul
// günü; satırların sırası önemli değil (her şey gün haritasıyla hesaplanır).
export function takipDurumHesapla(
  satirlar: { gun: string; yapildi: boolean | null }[],
  bugun: string
): TakipDurum {
  const harita = new Map(satirlar.map((s) => [s.gun, s.yapildi]));

  const bugunYapildi = harita.has(bugun) ? !!harita.get(bugun) : null;
  const toplam = satirlar.filter((s) => s.yapildi).length;

  // Seri: bugünden (ya da dünden) geriye kesintisiz "yapıldı".
  // [C#22] SERİ SİGORTASI: her TAKVİM AYINDA bir "joker" — o ay içindeki TEK bir
  // kaçırılan günü köprüler (seriyi kırmaz). Aynı ayda ikinci kaçırma köprülenmez.
  // Joker geçmişten deterministik hesaplanır (ekstra kolon/DB yok); kural şeffaf.
  let seri = 0;
  const jokerKullanilanAylar = new Set<string>();
  let sigortaBuAyKullanildi = false;
  const buAy = bugun.slice(0, 7); // YYYY-MM
  // Köprü ancak bir SONRAKİ "yapıldı"ya bağlanırsa geçerli (provisional → commit).
  // Serinin sonundaki boşluğa uzanan joker "kullanıldı" sayılmaz.
  let bekleyenJokerAy: string | null = null;
  for (let i = 0; i < 120; i++) {
    const g = bugunTr(new Date(Date.parse(bugun) - i * 86_400_000));
    const v = harita.get(g);
    if (v) {
      seri++;
      if (bekleyenJokerAy) {
        // Bekleyen köprü gerçek bir "yapıldı"ya bağlandı → joker KESİN kullanıldı.
        jokerKullanilanAylar.add(bekleyenJokerAy);
        if (bekleyenJokerAy === buAy) sigortaBuAyKullanildi = true;
        bekleyenJokerAy = null;
      }
      continue;
    }
    if (i === 0) continue; // bugün henüz işaretlenmediyse seriyi kırma
    const ay = g.slice(0, 7);
    // Bu ayın jokeri boş + o an bekleyen köprü yok → tek kaçırılan günü köprüle.
    if (bekleyenJokerAy === null && !jokerKullanilanAylar.has(ay)) {
      bekleyenJokerAy = ay; // provisional; sonraki "yapıldı" onaylar
      continue;
    }
    break; // joker yok / arka arkaya ikinci boşluk → seri burada durur
  }

  // Son 14 gün şeridi.
  const son14: { gun: string; yapildi: boolean | null }[] = [];
  for (let i = 13; i >= 0; i--) {
    const g = bugunTr(new Date(Date.parse(bugun) - i * 86_400_000));
    son14.push({ gun: g, yapildi: harita.has(g) ? !!harita.get(g) : null });
  }

  // Son "yapıldı" gününden bu yana kaçırılan gün (hiç yoksa 999 → "hiç adım yok").
  const yapildiGunler = satirlar.filter((s) => s.yapildi).map((s) => s.gun);
  const sonYapildi = yapildiGunler.length
    ? yapildiGunler.reduce((a, b) => (a > b ? a : b))
    : null;
  const kacirilanGun = sonYapildi ? gunFarki(bugun, sonYapildi) : 999;

  return { bugunYapildi, seri, toplam, son14, kacirilanGun, sigortaBuAyKullanildi };
}

// Eskalasyon eşikleri — tek yerde.
export const DURTME_THROTTLE_MS = 20 * 3_600_000; // kişiyi günde en fazla 1 kez dürt
export const TANIK_THROTTLE_MS = 44 * 3_600_000; // şahitleri ~2 günde 1 kez uyar
export const KISI_DURT_ESIK = 2; // 2+ gün kaçırma → kişiyi dürt
export const TANIK_UYAR_ESIK = 4; // 4+ gün kaçırma → şahitleri uyar

export type EskalasyonKarar = { kisiDurt: boolean; tanikUyar: boolean };

// Bir sözün eskalasyon kararı: kaç gün kaçırıldığı + throttle damgaları + şimdi.
// kisiDurt: 2+ gün ve son dürtmeden 20 saat geçti.
// tanikUyar: 4+ gün ve son şahit uyarısından 44 saat geçti.
export function eskalasyonKarar(
  kacirilanGun: number,
  sonDurtmeAt: string | null,
  sonTanikUyariAt: string | null,
  simdi: number
): EskalasyonKarar {
  if (kacirilanGun < KISI_DURT_ESIK) return { kisiDurt: false, tanikUyar: false };

  const sonDurtme = sonDurtmeAt ? Date.parse(sonDurtmeAt) : 0;
  const kisiDurt = simdi - sonDurtme > DURTME_THROTTLE_MS;

  let tanikUyar = false;
  if (kacirilanGun >= TANIK_UYAR_ESIK) {
    const sonUyari = sonTanikUyariAt ? Date.parse(sonTanikUyariAt) : 0;
    tanikUyar = simdi - sonUyari > TANIK_THROTTLE_MS;
  }

  return { kisiDurt, tanikUyar };
}
