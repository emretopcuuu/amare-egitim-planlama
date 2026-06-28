import "server-only";
import type { Db } from "@/lib/degerlendirme";
import type { KariyerHal } from "@/lib/persona";

// KARŞILAŞMA — "iki aynanın buluşması". AYNA, persona hâli birbirini TAMAMLAYAN
// iki kişiyi eşler ve gerçek bir yüz yüze konuşmaya davet eder. Veriden doğan ama
// kişiye sezdirilmeyen bir bağ: "AYNA sizi eşledi, 10 dk konuşun."
//
// Bilinçli olarak HAFİF: yalnız persona hâline (kariyer_durumu) bakar — puan
// agregasyonu yok, her ekran yükünde çalışacak kadar ucuz. Kör nokta içeriği de
// açılmaz; yalnız partnerin adı gösterilir (zaten kampta herkes birbirini görür).

// Tamamlayıcı eşleşme: yükselen ↔ düşüşten dönen (umut taşır); test edilmemiş ↔
// duraksamış (biri tazelik biri tecrübe getirir). Çift yönlü.
const TAMAMLAYAN: Record<KariyerHal, KariyerHal> = {
  gerileme: "yukselis",
  yukselis: "gerileme",
  test_edilmemis: "duraksama",
  duraksama: "test_edilmemis",
};

type Kisi = { id: string; full_name: string; team: string | null; kariyer_durumu: string | null };

// Deterministik seçim (her seferinde aynı eşleşme) — pid tohumlu.
function tohum(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export type Karsilasma = { partnerAd: string };

export async function karsilasmaBul(db: Db, pid: string): Promise<Karsilasma | null> {
  const { data } = await db
    .from("participants")
    .select("id, full_name, team, kariyer_durumu")
    .eq("role", "participant");
  const kisiler = (data ?? []) as Kisi[];
  const ben = kisiler.find((k) => k.id === pid);
  if (!ben || kisiler.length < 2) return null;

  const digerleri = kisiler.filter((k) => k.id !== pid);

  // 1) Tamamlayıcı persona + farklı takım (taze bakış) — en iyi eşleşme.
  // 2) Sadece tamamlayıcı persona.
  // 3) Sadece farklı takım.
  // 4) Herhangi biri (kimse açıkta kalmasın).
  const benHal = ben.kariyer_durumu as KariyerHal | null;
  const hedefHal = benHal ? TAMAMLAYAN[benHal] : null;
  const farkliTakim = (k: Kisi) => !!ben.team && !!k.team && k.team !== ben.team;

  const havuzlar: Kisi[][] = [
    hedefHal ? digerleri.filter((k) => k.kariyer_durumu === hedefHal && farkliTakim(k)) : [],
    hedefHal ? digerleri.filter((k) => k.kariyer_durumu === hedefHal) : [],
    digerleri.filter(farkliTakim),
    digerleri,
  ];

  for (const havuz of havuzlar) {
    if (havuz.length > 0) {
      const secilen = havuz[tohum(pid) % havuz.length];
      return { partnerAd: secilen.full_name };
    }
  }
  return null;
}
