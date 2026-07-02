import "server-only";
import type { Db } from "@/lib/degerlendirme";

// [4.2] ARA MÜHÜR ZİNCİRİ — kamptaki söz zincirin ilk halkasıdır; +30/+60/+90
// günlerinde kişi sözünü yeniden okuyup tek cümlelik teyit ekler. Hangi
// halkaların AÇIK olduğunu orkestratörün çevirdiği settings bayrakları belirler
// (muhur_plus30_acik / _plus60_acik / _plus90_acik).

export const HALKALAR = [30, 60, 90] as const;
export type HalkaNo = (typeof HALKALAR)[number];

const BAYRAK: Record<HalkaNo, string> = {
  30: "muhur_plus30_acik",
  60: "muhur_plus60_acik",
  90: "muhur_plus90_acik",
};

export type ZincirHalka = {
  halka: HalkaNo;
  acik: boolean;
  teyit: string | null;
  tarih: string | null;
};

export type ZincirDurumu = {
  soz: string | null; // ilk halka: kamptaki söz
  // [7] GELECEĞE ÇAPA — kamp doruğunda işaretlenen tek kelime + 0-10 his
  // (zirve_olcum). +30 halkasında geri çalınır: "o gün şunu hissetmiştin".
  zirveKelime: string | null;
  zirvePuan: number | null;
  halkalar: ZincirHalka[];
};

export async function zincirDurumu(db: Db, pid: string): Promise<ZincirDurumu> {
  const [{ data: soz }, { data: ayarlar }, { data: teyitler }, { data: zirve }] = await Promise.all([
    db.from("soz").select("metin").eq("participant_id", pid).maybeSingle(),
    db.from("settings").select("key, value").in("key", Object.values(BAYRAK)),
    db.from("muhur_zinciri").select("halka, teyit, created_at").eq("participant_id", pid),
    db.from("zirve_olcum").select("kelime, puan").eq("participant_id", pid).maybeSingle(),
  ]);

  const acikMap = new Map((ayarlar ?? []).map((a) => [a.key, a.value]));
  const teyitMap = new Map((teyitler ?? []).map((t) => [t.halka as number, t]));

  const halkalar: ZincirHalka[] = HALKALAR.map((h) => {
    const t = teyitMap.get(h);
    return {
      halka: h,
      acik: acikMap.get(BAYRAK[h]) === "true",
      teyit: t?.teyit ?? null,
      tarih: t?.created_at ?? null,
    };
  });

  return {
    soz: soz?.metin ?? null,
    zirveKelime: zirve?.kelime ?? null,
    zirvePuan: zirve?.puan ?? null,
    halkalar,
  };
}

// Kişi bir halkayı teyit eder. Yalnız AÇIK ve henüz teyit edilmemiş halka için.
export async function halkaTeyitEt(
  db: Db,
  pid: string,
  halka: number,
  teyit: string
): Promise<{ ok: boolean; sebep?: string }> {
  if (!HALKALAR.includes(halka as HalkaNo)) return { ok: false, sebep: "gecersiz" };
  const temiz = (teyit ?? "").trim().slice(0, 500);
  if (!temiz) return { ok: false, sebep: "bos" };

  // Bayrak açık mı?
  const { data: ayar } = await db
    .from("settings")
    .select("value")
    .eq("key", BAYRAK[halka as HalkaNo])
    .maybeSingle();
  if (ayar?.value !== "true") return { ok: false, sebep: "kapali" };

  const { error } = await db
    .from("muhur_zinciri")
    .insert({ participant_id: pid, halka, teyit: temiz });
  if (error) {
    if (error.code === "23505") return { ok: false, sebep: "zaten" };
    return { ok: false, sebep: "hata" };
  }
  return { ok: true };
}
