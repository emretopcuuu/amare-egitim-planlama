import "server-only";
import type { supabaseAdmin } from "@/lib/supabase/server";

type Db = ReturnType<typeof supabaseAdmin>;

// B3 — GRUP FOTO-MOZAİĞİ. Her üye grubunun mozaiğine tek parça (foto) ekler;
// /mozaik sayfası grubun dolan mozaiğini canlı gösterir. Kişi başına tek parça
// (unique participant_id) — tekrar yüklerse günceller. Yalnız mozaik_acik iken.

export async function mozaikAcikMi(db: Db): Promise<boolean> {
  const { data } = await db.from("settings").select("value").eq("key", "mozaik_acik").maybeSingle();
  return data?.value === "true";
}

export async function parcaEkle(
  db: Db,
  pid: string,
  grup: string,
  fotoPath: string
): Promise<boolean> {
  const { error } = await db
    .from("mozaik_parca")
    .upsert(
      { participant_id: pid, grup, foto_path: fotoPath, created_at: new Date().toISOString() },
      { onConflict: "participant_id" }
    );
  return !error;
}

export type MozaikParca = { participant_id: string; foto_path: string };

export async function grupParcalari(db: Db, grup: string): Promise<MozaikParca[]> {
  const { data } = await db
    .from("mozaik_parca")
    .select("participant_id, foto_path")
    .eq("grup", grup)
    .order("created_at", { ascending: true });
  return (data ?? []) as MozaikParca[];
}
