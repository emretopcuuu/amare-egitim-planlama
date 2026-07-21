import "server-only";
import type { Db } from "@/lib/degerlendirme";
import { takipDurum } from "@/lib/sozTakip";

// ORTAK MOMENTUM (#14, hafifletilmiş) — kişinin "söz çevresi" (kendi şahitleri
// + şahit olduğu kişiler) içinde bu hafta kaç kişinin sözünü tuttuğunu gösterir.
// Mühür Zinciri'yle (+30/60/90 halkaları) İSİM ÇAKIŞMASIN diye "zincir" değil
// "çevre" dili kullanılır — farklı bir özellik, ayrı kavram. Basit, akran
// baskısı yaratan bir sosyal gösterge; ağır bir sosyal-graf görselleştirmesi
// DEĞİL (kapsam bilinçli olarak dar tutuldu).

// [C#25] NAZİK LİG: çevre içinde kişinin bu haftaki KATILIM sırası (yalnız
// katılım = son 7 günde işaretleme sayısı; satış/sonuç DEĞİL). İSİMSİZ — kişi
// yalnız KENDİ sırasını görür, kimse teşhir edilmez; utandırmaz, hafif bir
// akran enerjisi verir. Aynı çevre döngüsünde hesaplanır (ek maliyet ~1 sorgu).
export type OrtakMomentum = {
  cevreToplam: number;
  buHaftaAktif: number;
  ligSira: number | null; // kişinin sırası (1 = en önde); çevre <2 ise null
  ligToplam: number; // sıralamaya giren kişi sayısı (kişi dahil)
};

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
  const skor = new Map<string, number>();
  // Kişinin kendi katılım skoru (lig için) — çevreye ek tek sorgu.
  const benimDurum = await takipDurum(db, pid);
  skor.set(pid, benimDurum.son14.slice(-7).filter((g) => g.yapildi === true).length);
  for (const id of cevreIdleri) {
    const durum = await takipDurum(db, id);
    if (durum.kacirilanGun === 0) aktif++;
    skor.set(id, durum.son14.slice(-7).filter((g) => g.yapildi === true).length);
  }

  const benimSkor = skor.get(pid) ?? 0;
  let onde = 0;
  for (const [id, s] of skor) if (id !== pid && s > benimSkor) onde++;
  const ligToplam = skor.size;
  const ligSira = ligToplam >= 2 ? onde + 1 : null;

  return { cevreToplam: cevreIdleri.size, buHaftaAktif: aktif, ligSira, ligToplam };
}
