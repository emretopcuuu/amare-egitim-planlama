import "server-only";
import type { Db } from "@/lib/degerlendirme";

// [KURULUM 7/8] ROZETLER — tek seferlik başarımlar + küçük kıvılcım kaynağı.
// Kıvılcım normalde yalnız missions'tan türer; rozet kıvılcımı ayrı tutulur
// (rozetler tablosu) ve kişinin kimlik başlığında toplam kıvılcıma eklenir.
// Rekabetçi /ekran ligi salt görev-tabanlı kalır — kurulum ödülü sıralamayı
// bozmaz, sadece kişinin kendi "kıvılcımını" büyütür.

export type RozetTanim = { kod: string; ad: string; ikon: string; kivilcim: number; aciklama: string };

export const ROZETLER: Record<string, RozetTanim> = {
  ilk_isik: {
    kod: "ilk_isik",
    ad: "İlk Işık",
    ikon: "🔥",
    kivilcim: 15,
    aciklama: "Bildirimlerini açtın — AYNA artık sana ulaşabilir.",
  },
  el_ele: {
    kod: "el_ele",
    ad: "El Ele",
    ikon: "🤝",
    kivilcim: 10,
    aciklama: "Bir yol arkadaşının telefonunu doğruladın; ikiniz de hazırsınız.",
  },
};

export type KazanilanRozet = { kod: string; ad: string; ikon: string; kivilcim: number };

/** Rozeti idempotent verir. Zaten varsa yeni=false döner (tekrar kıvılcım yok). */
export async function rozetVer(db: Db, pid: string, kod: keyof typeof ROZETLER): Promise<{ yeni: boolean; rozet: RozetTanim }> {
  const rozet = ROZETLER[kod];
  const { data } = await db
    .from("rozetler")
    .upsert(
      { participant_id: pid, kod: rozet.kod, kivilcim: rozet.kivilcim },
      { onConflict: "participant_id,kod", ignoreDuplicates: true }
    )
    .select("id");
  // ignoreDuplicates: satır zaten varsa data boş döner → yeni değil.
  return { yeni: !!(data && data.length > 0), rozet };
}

/** Kişinin kazandığı rozetler (kimlik başlığı için). */
export async function rozetleriGetir(db: Db, pid: string): Promise<KazanilanRozet[]> {
  const { data } = await db
    .from("rozetler")
    .select("kod, kivilcim, created_at")
    .eq("participant_id", pid)
    .order("created_at", { ascending: true });
  return (data ?? [])
    .map((r) => {
      const t = ROZETLER[r.kod];
      return t ? { kod: r.kod, ad: t.ad, ikon: t.ikon, kivilcim: r.kivilcim } : null;
    })
    .filter((r): r is KazanilanRozet => r !== null);
}

/** Kişinin rozetlerden gelen toplam kıvılcımı. */
export async function rozetKivilcimi(db: Db, pid: string): Promise<number> {
  const { data } = await db.from("rozetler").select("kivilcim").eq("participant_id", pid);
  return (data ?? []).reduce((t, r) => t + (r.kivilcim ?? 0), 0);
}
