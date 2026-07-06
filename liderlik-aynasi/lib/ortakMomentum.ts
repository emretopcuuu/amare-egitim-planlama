import "server-only";
import type { Db } from "@/lib/degerlendirme";
import { takipDurum } from "@/lib/sozTakip";

// ORTAK MOMENTUM (#14, hafifletilmiş) — kişinin "söz çevresi" (kendi şahitleri
// + şahit olduğu kişiler) içinde bu hafta kaç kişinin sözünü tuttuğunu gösterir.
// Mühür Zinciri'yle (+30/60/90 halkaları) İSİM ÇAKIŞMASIN diye "zincir" değil
// "çevre" dili kullanılır — farklı bir özellik, ayrı kavram. Basit, akran
// baskısı yaratan bir sosyal gösterge; ağır bir sosyal-graf görselleştirmesi
// DEĞİL (kapsam bilinçli olarak dar tutuldu).

export type OrtakMomentum = { cevreToplam: number; buHaftaAktif: number };

export async function ortakMomentumGetir(db: Db, pid: string): Promise<OrtakMomentum | null> {
  const [{ data: benimSahitlerim }, { data: sahidiOldugum }] = await Promise.all([
    db.from("soz_tanik").select("witness_id").eq("soz_sahibi", pid).not("imza_at", "is", null),
    db.from("soz_tanik").select("soz_sahibi").eq("witness_id", pid).not("imza_at", "is", null),
  ]);
  const cevreIdleri = new Set<string>([
    ...(benimSahitlerim ?? []).map((r) => r.witness_id),
    ...(sahidiOldugum ?? []).map((r) => r.soz_sahibi),
  ]);
  cevreIdleri.delete(pid);
  if (cevreIdleri.size === 0) return null;

  let aktif = 0;
  for (const id of cevreIdleri) {
    const durum = await takipDurum(db, id);
    if (durum.kacirilanGun === 0) aktif++;
  }
  return { cevreToplam: cevreIdleri.size, buHaftaAktif: aktif };
}
