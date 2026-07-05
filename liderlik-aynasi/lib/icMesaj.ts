import "server-only";
import type { Db } from "@/lib/degerlendirme";
import { katilimciyaBildir } from "@/lib/push";

// İÇ MESAJLAŞMA — grup arkadaşları arası + katılımcı↔kamp yönetimi (admin).
// Her gönderilen mesaj alıcıya BİLDİRİM olarak da düşer (gelen kutusu + zil).
// Yönetime giden mesajlar admin panelindeki gelen kutusunda toplanır.

export const YONETIM = "yonetim"; // sohbet rota anahtarı: /grup/sohbet/yonetim

export type IcMesaj = {
  id: string;
  gonderen_id: string;
  gonderen_admin: boolean;
  alici_id: string | null;
  admin_hedef: boolean;
  govde: string;
  okundu_at: string | null;
  created_at: string;
};

export type GrupUye = {
  id: string;
  full_name: string;
  kariyer_seviyesi: string | null;
  profil_foto_path: string | null; // KisiKarti fotoğrafı için (sunucu imzalı URL'e çevirir)
  phone: string | null; // WhatsApp köprüsü için
  okunmamis: number; // bu üyeden gelen okunmamış mesaj sayısı
};

function onizleme(govde: string): string {
  const t = govde.trim().replace(/\s+/g, " ");
  return t.length > 90 ? `${t.slice(0, 88)}…` : t;
}

// Aynı gruptaki diğer katılımcılar (ben hariç) + her birinden gelen okunmamış sayısı.
export async function grupUyeleri(db: Db, takim: string, benId: string): Promise<GrupUye[]> {
  const { data: uyeler } = await db
    .from("participants")
    .select("id, full_name, kariyer_seviyesi, profil_foto_path, phone")
    .eq("team", takim)
    .eq("role", "participant")
    .neq("id", benId)
    .order("full_name", { ascending: true });
  const liste = (uyeler ?? []) as Omit<GrupUye, "okunmamis">[];
  if (liste.length === 0) return [];

  // Bu kişiye, grup üyelerinden gelen okunmamış mesajlar (tek sorgu → eşle).
  const { data: gelen } = await db
    .from("ic_mesajlar")
    .select("gonderen_id")
    .eq("alici_id", benId)
    .eq("gonderen_admin", false)
    .is("okundu_at", null);
  const sayac = new Map<string, number>();
  for (const m of gelen ?? []) sayac.set(m.gonderen_id, (sayac.get(m.gonderen_id) ?? 0) + 1);

  return liste.map((u) => ({ ...u, okunmamis: sayac.get(u.id) ?? 0 }));
}

// Ben ↔ bir grup üyesi arasındaki sohbet (kronolojik). Açınca o kişiden gelenler
// okundu işaretlenir (zil rozeti düşer).
export async function uyeSohbeti(db: Db, benId: string, digerId: string): Promise<IcMesaj[]> {
  const { data } = await db
    .from("ic_mesajlar")
    .select("*")
    .eq("gonderen_admin", false)
    .eq("admin_hedef", false)
    .or(
      `and(gonderen_id.eq.${benId},alici_id.eq.${digerId}),and(gonderen_id.eq.${digerId},alici_id.eq.${benId})`,
    )
    .order("created_at", { ascending: true });
  const liste = (data ?? []) as IcMesaj[];
  await db
    .from("ic_mesajlar")
    .update({ okundu_at: new Date().toISOString() })
    .eq("alici_id", benId)
    .eq("gonderen_id", digerId)
    .eq("gonderen_admin", false)
    .is("okundu_at", null);
  return liste;
}

// Ben (katılımcı) ↔ kamp yönetimi sohbeti. Yönetimin bana yazdıkları okundu olur.
export async function yonetimSohbeti(db: Db, benId: string): Promise<IcMesaj[]> {
  const { data } = await db
    .from("ic_mesajlar")
    .select("*")
    .or(`and(gonderen_id.eq.${benId},admin_hedef.eq.true),and(gonderen_admin.eq.true,alici_id.eq.${benId})`)
    .order("created_at", { ascending: true });
  const liste = (data ?? []) as IcMesaj[];
  await db
    .from("ic_mesajlar")
    .update({ okundu_at: new Date().toISOString() })
    .eq("alici_id", benId)
    .eq("gonderen_admin", true)
    .is("okundu_at", null);
  return liste;
}

// Katılımcının TÜM okunmamış iç mesajları (grup + yönetim) — zil/menü rozeti.
export async function okunmamisMesaj(db: Db, benId: string): Promise<number> {
  const { count } = await db
    .from("ic_mesajlar")
    .select("id", { count: "exact", head: true })
    .eq("alici_id", benId)
    .is("okundu_at", null);
  return count ?? 0;
}

type Hedef = { aliciId: string } | { yonetim: true };

// Mesaj gönder: satırı yaz + alıcıya bildirim düşür. gonderenAdmin=true ise
// gönderen yönetimdir (admin panelinden cevap).
export async function mesajGonder(
  db: Db,
  gonderenId: string,
  gonderenAd: string,
  hedef: Hedef,
  govde: string,
  gonderenAdmin = false,
): Promise<{ tamam: boolean; hata?: string }> {
  const metin = govde.trim();
  if (!metin) return { tamam: false, hata: "Boş mesaj gönderilemez." };
  if (metin.length > 2000) return { tamam: false, hata: "Mesaj çok uzun." };

  const yonetime = "yonetim" in hedef;
  const aliciId = yonetime ? null : hedef.aliciId;

  const { error } = await db.from("ic_mesajlar").insert({
    gonderen_id: gonderenId,
    gonderen_admin: gonderenAdmin,
    alici_id: aliciId,
    admin_hedef: yonetime,
    govde: metin,
  });
  if (error) return { tamam: false, hata: "Mesaj kaydedilemedi." };

  // Bildirim: yalnız bir katılımcı alıcı varsa (yönetime gidende admin paneli
  // gelen kutusu yeterli — katılımcı bildirimi yok).
  if (aliciId) {
    const baslik = gonderenAdmin ? "Kamp yönetiminden mesaj 💬" : `${gonderenAd} sana yazdı 💬`;
    const url = gonderenAdmin ? `/grup/sohbet/${YONETIM}` : `/grup/sohbet/${gonderenId}`;
    await katilimciyaBildir(db, aliciId, baslik, onizleme(metin), url);
  }
  return { tamam: true };
}

// ---- ADMIN TARAFI ----

export type AdminGelenOzet = {
  kisiId: string;
  ad: string;
  takim: string | null;
  sonMesaj: string;
  sonZaman: string;
  okunmamis: number;
};

// Yönetime gelen mesajların kişi bazında özeti (gelen kutusu). Okunmamış üstte.
export async function adminGelenKutusu(db: Db): Promise<AdminGelenOzet[]> {
  const { data } = await db
    .from("ic_mesajlar")
    .select("gonderen_id, govde, okundu_at, created_at, gonderen:participants!ic_mesajlar_gonderen_id_fkey(full_name, team)")
    .eq("admin_hedef", true)
    .order("created_at", { ascending: false })
    .limit(1000);
  const harita = new Map<string, AdminGelenOzet>();
  for (const m of (data ?? []) as unknown as {
    gonderen_id: string;
    govde: string;
    okundu_at: string | null;
    created_at: string;
    gonderen: { full_name: string; team: string | null } | null;
  }[]) {
    const v = harita.get(m.gonderen_id);
    if (v) {
      if (!m.okundu_at) v.okunmamis += 1;
    } else {
      harita.set(m.gonderen_id, {
        kisiId: m.gonderen_id,
        ad: m.gonderen?.full_name ?? "—",
        takim: m.gonderen?.team ?? null,
        sonMesaj: onizleme(m.govde),
        sonZaman: m.created_at,
        okunmamis: m.okundu_at ? 0 : 1,
      });
    }
  }
  return [...harita.values()].sort((a, b) => {
    if (a.okunmamis !== b.okunmamis) return b.okunmamis - a.okunmamis;
    return a.sonZaman < b.sonZaman ? 1 : -1;
  });
}

// Yönetim ↔ belirli katılımcı sohbeti (admin görünümü). Kişinin yönetime
// yazdıkları okundu işaretlenir.
export async function adminKisiSohbeti(db: Db, kisiId: string): Promise<IcMesaj[]> {
  const { data } = await db
    .from("ic_mesajlar")
    .select("*")
    .or(`and(gonderen_id.eq.${kisiId},admin_hedef.eq.true),and(gonderen_admin.eq.true,alici_id.eq.${kisiId})`)
    .order("created_at", { ascending: true });
  const liste = (data ?? []) as IcMesaj[];
  await db
    .from("ic_mesajlar")
    .update({ okundu_at: new Date().toISOString() })
    .eq("gonderen_id", kisiId)
    .eq("admin_hedef", true)
    .is("okundu_at", null);
  return liste;
}

// Yönetime gelen toplam okunmamış mesaj (admin nav rozeti).
export async function adminOkunmamis(db: Db): Promise<number> {
  const { count } = await db
    .from("ic_mesajlar")
    .select("id", { count: "exact", head: true })
    .eq("admin_hedef", true)
    .is("okundu_at", null);
  return count ?? 0;
}
