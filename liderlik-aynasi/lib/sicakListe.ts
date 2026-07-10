import "server-only";
import type { Db } from "@/lib/degerlendirme";

// #2 SICAK LİSTE — kişinin gerçek aday/çevre listesi. Kamp görevleri bu
// isimlerle çalışır; kapanışta 90-gün planına akar. Salt sunucu (deny-all RLS).

export type SicakDurum = "aday" | "temas" | "randevu" | "kayit" | "pas";

export type SicakKisi = {
  id: number;
  isim: string;
  aciklama: string | null;
  durum: SicakDurum;
  sira: number;
};

const DURUMLAR: SicakDurum[] = ["aday", "temas", "randevu", "kayit", "pas"];
const MAKS = 30; // kişi başı üst sınır (aşırı girişten koruma)

export async function sicakListeGetir(db: Db, pid: string): Promise<SicakKisi[]> {
  const { data } = await db
    .from("sicak_liste")
    .select("id, isim, aciklama, durum, sira")
    .eq("participant_id", pid)
    .order("sira", { ascending: true })
    .order("id", { ascending: true });
  return (data ?? []) as SicakKisi[];
}

// Yeni isim ekle (kısa doğrulama + üst sınır). Eklenen satır döner ya da null.
export async function sicakListeEkle(
  db: Db,
  pid: string,
  isim: string,
  aciklama?: string | null
): Promise<SicakKisi | null> {
  const temiz = isim.trim().slice(0, 80);
  if (!temiz) return null;
  const { count } = await db
    .from("sicak_liste")
    .select("id", { count: "exact", head: true })
    .eq("participant_id", pid);
  if ((count ?? 0) >= MAKS) return null;
  const { data } = await db
    .from("sicak_liste")
    .insert({
      participant_id: pid,
      isim: temiz,
      aciklama: aciklama?.trim().slice(0, 200) || null,
      sira: count ?? 0,
    })
    .select("id, isim, aciklama, durum, sira")
    .maybeSingle();
  return (data as SicakKisi | null) ?? null;
}

export async function sicakListeDurumGuncelle(
  db: Db,
  pid: string,
  id: number,
  durum: string
): Promise<boolean> {
  if (!DURUMLAR.includes(durum as SicakDurum)) return false;
  const { error } = await db
    .from("sicak_liste")
    .update({ durum, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("participant_id", pid); // sahiplik: yalnız kendi satırı
  return !error;
}

export async function sicakListeSil(db: Db, pid: string, id: number): Promise<boolean> {
  const { error } = await db
    .from("sicak_liste")
    .delete()
    .eq("id", id)
    .eq("participant_id", pid);
  return !error;
}

// Görev motoru için: kişinin henüz kayıt olmamış (aday/temas/randevu) isimleri —
// görev "listenden X'i ara" gibi gerçek bir isme demirlenebilsin. En fazla birkaç.
export async function sicakListeAktifIsimler(db: Db, pid: string): Promise<string[]> {
  const { data } = await db
    .from("sicak_liste")
    .select("isim, durum, sira")
    .eq("participant_id", pid)
    .in("durum", ["aday", "temas", "randevu"])
    .order("sira", { ascending: true })
    .limit(8);
  return (data ?? []).map((r) => r.isim as string);
}
