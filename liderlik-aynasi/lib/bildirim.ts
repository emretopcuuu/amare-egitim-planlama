import "server-only";
import type { Db } from "@/lib/degerlendirme";

// Bildirim gelen kutusu okuma/yazma yardımcıları. Tüm bildirimler push.ts
// (katilimciyaBildir/herkeseBildir) tarafından kalıcı yazılır; burada listelenir,
// okunmamış sayılır ve okundu işaretlenir.

export type Bildirim = {
  id: string;
  baslik: string;
  govde: string;
  url: string | null;
  okundu_at: string | null;
  created_at: string;
};

export async function bildirimleriGetir(db: Db, pid: string, limit = 100): Promise<Bildirim[]> {
  const { data } = await db
    .from("bildirimler")
    .select("id, baslik, govde, url, okundu_at, created_at")
    .eq("participant_id", pid)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as Bildirim[];
}

export async function okunmamisSayisi(db: Db, pid: string): Promise<number> {
  const { count } = await db
    .from("bildirimler")
    .select("id", { count: "exact", head: true })
    .eq("participant_id", pid)
    .is("okundu_at", null);
  return count ?? 0;
}

export async function hepsiniOkunduYap(db: Db, pid: string): Promise<void> {
  await db
    .from("bildirimler")
    .update({ okundu_at: new Date().toISOString() })
    .eq("participant_id", pid)
    .is("okundu_at", null);
}
