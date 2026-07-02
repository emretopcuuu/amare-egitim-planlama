import "server-only";
import type { Db } from "@/lib/degerlendirme";

// [5.4] İŞ VERİSİ KÖPRÜSÜ — kişi haftalık gerçek iş sayılarını girer. "hafta" =
// kamptan bu yana kaçıncı hafta (ayna_baslangic'tan türetilir). Rakamlar salt
// sunucu üzerinden okunur/yazılır (deny-all).

export type IsVerisiSatiri = {
  hafta: number;
  gorusme: number;
  kayit: number;
  takip: number;
};

export type IsVerisiDurumu = {
  buHafta: number | null; // kamp başlamadıysa null
  satirlar: IsVerisiSatiri[]; // eskiden yeniye
  toplam: { gorusme: number; kayit: number; takip: number };
};

async function baslangicIso(db: Db): Promise<string | null> {
  const { data } = await db
    .from("settings")
    .select("value")
    .eq("key", "ayna_baslangic")
    .maybeSingle();
  return data?.value ?? null;
}

// Kamptan bu yana kaçıncı hafta (Hafta 1 = ilk 7 gün).
export function haftaHesapla(baslangic: string): number {
  const gun = Math.floor((Date.now() - Date.parse(baslangic)) / 86_400_000);
  return Math.max(1, Math.floor(gun / 7) + 1);
}

export async function isVerisiDurumu(db: Db, pid: string): Promise<IsVerisiDurumu> {
  const iso = await baslangicIso(db);
  const buHafta = iso ? haftaHesapla(iso) : null;

  const { data } = await db
    .from("is_verisi")
    .select("hafta, gorusme, kayit, takip")
    .eq("participant_id", pid)
    .order("hafta", { ascending: true });

  const satirlar = (data ?? []) as IsVerisiSatiri[];
  const toplam = satirlar.reduce(
    (a, s) => ({
      gorusme: a.gorusme + s.gorusme,
      kayit: a.kayit + s.kayit,
      takip: a.takip + s.takip,
    }),
    { gorusme: 0, kayit: 0, takip: 0 }
  );
  return { buHafta, satirlar, toplam };
}

// Bu haftanın sayılarını kaydet (upsert). Negatif/aşırı değerler kırpılır.
export async function isVerisiKaydet(
  db: Db,
  pid: string,
  hafta: number,
  v: { gorusme: number; kayit: number; takip: number }
): Promise<boolean> {
  if (!Number.isFinite(hafta) || hafta < 1) return false;
  const kirp = (n: number) => Math.min(9999, Math.max(0, Math.round(Number(n) || 0)));
  const { error } = await db.from("is_verisi").upsert(
    {
      participant_id: pid,
      hafta: Math.round(hafta),
      gorusme: kirp(v.gorusme),
      kayit: kirp(v.kayit),
      takip: kirp(v.takip),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "participant_id,hafta" }
  );
  return !error;
}
