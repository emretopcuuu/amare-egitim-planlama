import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

// Sayfalar ve API rotaları arasında paylaşılan dalga/özellik/ilerleme sorguları.
// Yetkilendirme kuralları (öz-puan kapısı, dalga açık mı) hem UI'da hem API'de
// bu yardımcılarla aynı kaynaktan doğrulanır.

export type Db = SupabaseClient<Database>;

export type AcikDalga = { id: number; name: string };
export type Ozellik = { id: number; name: string; observation_hint: string };

export async function acikDalga(db: Db): Promise<AcikDalga | null> {
  const { data, error } = await db
    .from("waves")
    .select("id, name")
    .eq("is_open", true)
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function aktifOzellikler(db: Db): Promise<Ozellik[]> {
  const { data, error } = await db
    .from("traits")
    .select("id, name, observation_hint")
    .eq("active", true)
    .order("sort_order");
  if (error) throw error;
  return data;
}

/** Bu dalgada benim verdiğim puanların hedef bazında sayısı. */
export async function hedefBasinaPuanSayisi(
  db: Db,
  raterId: string,
  waveId: number
): Promise<Map<string, number>> {
  const { data, error } = await db
    .from("ratings")
    .select("target_id")
    .eq("rater_id", raterId)
    .eq("wave", waveId);
  if (error) throw error;
  const sayilar = new Map<string, number>();
  for (const r of data) sayilar.set(r.target_id, (sayilar.get(r.target_id) ?? 0) + 1);
  return sayilar;
}

/** Öz-puan kapısı: bu dalgada tüm aktif özellikler için kendini puanladı mı? */
export async function ozPuanTamamMi(
  db: Db,
  participantId: string,
  waveId: number,
  ozellikSayisi: number
): Promise<boolean> {
  const { count, error } = await db
    .from("ratings")
    .select("id", { count: "exact", head: true })
    .eq("rater_id", participantId)
    .eq("target_id", participantId)
    .eq("wave", waveId);
  if (error) throw error;
  return (count ?? 0) >= ozellikSayisi;
}
