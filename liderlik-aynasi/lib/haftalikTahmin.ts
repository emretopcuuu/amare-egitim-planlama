import "server-only";
import type { Db } from "@/lib/degerlendirme";

// [C#27] HAFTALIK TAHMİN veri katmanı. hafta_basi = o haftanın Pazartesi'si.

export async function tahminGetir(db: Db, pid: string, haftaBasi: string): Promise<number | null> {
  const { data } = await db
    .from("haftalik_tahmin")
    .select("tahmin")
    .eq("participant_id", pid)
    .eq("hafta_basi", haftaBasi)
    .maybeSingle();
  return data?.tahmin ?? null;
}

export async function tahminKaydet(
  db: Db,
  pid: string,
  haftaBasi: string,
  tahmin: number
): Promise<boolean> {
  const t = Math.max(0, Math.min(999, Math.round(tahmin)));
  const { error } = await db
    .from("haftalik_tahmin")
    .upsert(
      { participant_id: pid, hafta_basi: haftaBasi, tahmin: t },
      { onConflict: "participant_id,hafta_basi" }
    );
  return !error;
}
