import "server-only";
import type { Db } from "@/lib/degerlendirme";

// [4.1] 40 GÜN HALKASI — kamp sonrası 40 günlük "halka". Her AKTİF gün (o gün
// en az bir görev tamamlanmış) halkadan bir dilim doldurur. Amaç: 40 günü bir
// bütün olarak görünür kılmak — "kaç dilim doldu?". Gün 42'de orkestratör
// 'halka40' push'u ile kişiyi buraya çağırır (bkz. 0094 senaryo seed).

export const HALKA_DILIM = 40;

export type HalkaDurumu = {
  toplam: number; // 40
  dolan: number; // aktif gün sayısı (0-40)
  gun: number | null; // kamptan bu yana kaçıncı gün (null = kamp başlamadı)
  aktifGunler: number[]; // dolan dilimlerin gün indeksleri (1-40)
  seri: number; // en uzun ardışık aktif gün serisi
};

// Istanbul takvim tarihi ("YYYY-MM-DD").
function istanbulTarih(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

// İki Istanbul tarihi arasındaki gün farkı (b - a), tam gün.
function gunFarki(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

export async function halkaDurumu(db: Db, pid: string): Promise<HalkaDurumu> {
  const bos: HalkaDurumu = { toplam: HALKA_DILIM, dolan: 0, gun: null, aktifGunler: [], seri: 0 };

  const { data: ayar } = await db
    .from("settings")
    .select("value")
    .eq("key", "ayna_baslangic")
    .maybeSingle();
  if (!ayar?.value) return bos;

  const baslangicTarih = istanbulTarih(new Date(ayar.value));
  const bugun = gunFarki(baslangicTarih, istanbulTarih(new Date())) + 1; // Gün 1 = başlangıç günü

  // Kişinin tamamladığı görevlerin tamamlanma zamanları (kamp başından itibaren).
  const { data: gorevler } = await db
    .from("missions")
    .select("responded_at")
    .eq("participant_id", pid)
    .not("responded_at", "is", null)
    .gte("responded_at", new Date(ayar.value).toISOString());

  const aktifSet = new Set<number>();
  for (const g of gorevler ?? []) {
    if (!g.responded_at) continue;
    const gunIndex = gunFarki(baslangicTarih, istanbulTarih(new Date(g.responded_at))) + 1;
    if (gunIndex >= 1 && gunIndex <= HALKA_DILIM) aktifSet.add(gunIndex);
  }

  const aktifGunler = [...aktifSet].sort((a, b) => a - b);
  // En uzun ardışık seri.
  let seri = 0;
  let mevcut = 0;
  let onceki = -10;
  for (const g of aktifGunler) {
    mevcut = g === onceki + 1 ? mevcut + 1 : 1;
    if (mevcut > seri) seri = mevcut;
    onceki = g;
  }

  return {
    toplam: HALKA_DILIM,
    dolan: aktifGunler.length,
    gun: Math.max(1, bugun),
    aktifGunler,
    seri,
  };
}
