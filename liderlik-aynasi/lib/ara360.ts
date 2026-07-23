import "server-only";
import type { Db } from "@/lib/degerlendirme";

// [E#38] 45. GÜN ARA-360 veri katmanı (onboarding mini360_oz'dan ayrı).
export const ARA360_GUN = 45;

export async function ara360Yapildi(db: Db, pid: string): Promise<boolean> {
  const { data } = await db
    .from("ara_360")
    .select("id")
    .eq("participant_id", pid)
    .eq("gun", ARA360_GUN)
    .maybeSingle();
  return !!data;
}

export async function ara360Kaydet(
  db: Db,
  pid: string,
  korNokta: string | null,
  p: { gelisim: number; netlik: number; enerji: number }
): Promise<boolean> {
  const s = (n: number) => Math.max(1, Math.min(5, Math.round(n)));
  const { error } = await db.from("ara_360").insert({
    participant_id: pid,
    gun: ARA360_GUN,
    kor_nokta: korNokta,
    p_gelisim: s(p.gelisim),
    p_netlik: s(p.netlik),
    p_enerji: s(p.enerji),
  });
  return !error || error.code === "23505"; // zaten yapılmış → başarı say
}
