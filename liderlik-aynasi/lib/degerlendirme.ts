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

export type EksikKisi = { id: string; full_name: string; phone: string | null; login_code: string };

/** [Gün 3 dürtme] Açık değerlendirme dalgasında değerlendirmesini TAMAMLAMAMIŞ
 * kampa girmiş katılımcılar. Tanım (/degerlendir mantığıyla aynı): öz-puan tam
 * OLMALI + atanan hedeflerin hepsi tam puanlanmış OLMALI. Ataması olmayan kişi
 * için ölçüt: öz-puan tam + en az bir kişiyi tam puanlamış. Dalga kapalıysa []
 * döner (nudge anlamsız). Tek geçiş — kamp ölçeğinde hafif. */
export async function degerlendirmeEksikler(db: Db): Promise<EksikKisi[]> {
  const dalga = await acikDalga(db);
  if (!dalga) return [];
  const ozellikler = await aktifOzellikler(db);
  const T = ozellikler.length;
  if (T === 0) return [];

  const [{ data: kisiler }, { data: atamalar }, { data: puanlar }] = await Promise.all([
    db.from("participants").select("id, full_name, phone, login_code").eq("role", "participant").not("camp_unlocked_at", "is", null),
    db.from("assignments").select("observer_id, target_id"),
    db.from("ratings").select("rater_id, target_id").eq("wave", dalga.id),
  ]);

  // rater → (target → puanlanan özellik sayısı)
  const puanMap = new Map<string, Map<string, number>>();
  for (const p of puanlar ?? []) {
    const m = puanMap.get(p.rater_id) ?? new Map<string, number>();
    m.set(p.target_id, (m.get(p.target_id) ?? 0) + 1);
    puanMap.set(p.rater_id, m);
  }
  // observer → atanan target set
  const atamaMap = new Map<string, Set<string>>();
  for (const a of atamalar ?? []) {
    const s = atamaMap.get(a.observer_id) ?? new Set<string>();
    s.add(a.target_id);
    atamaMap.set(a.observer_id, s);
  }

  const eksikler: EksikKisi[] = [];
  for (const k of kisiler ?? []) {
    const benim = puanMap.get(k.id) ?? new Map<string, number>();
    const ozTam = (benim.get(k.id) ?? 0) >= T;
    const tamPuanlanan = (t: string) => (benim.get(t) ?? 0) >= T;
    const atananlar = atamaMap.get(k.id);
    let tamamMi: boolean;
    if (atananlar && atananlar.size > 0) {
      tamamMi = ozTam && [...atananlar].every(tamPuanlanan);
    } else {
      // Atama yok: en az kendini + bir başkasını tam puanlamış olmalı.
      const baskasiTam = [...benim.keys()].some((t) => t !== k.id && tamPuanlanan(t));
      tamamMi = ozTam && baskasiTam;
    }
    if (!tamamMi) eksikler.push({ id: k.id, full_name: k.full_name, phone: k.phone, login_code: k.login_code });
  }
  return eksikler;
}
