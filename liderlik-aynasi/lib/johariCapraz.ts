import "server-only";
import type { Db } from "@/lib/degerlendirme";
import { eslesmeHedefiSec, type EslesmeAday } from "@/lib/gorevEslesme";

// FAZ 3.2 — JOHARI ÇAPRAZ EŞLEŞTİRME. Bir kişinin kör noktası (öz>dış) hangi
// özellikteyse, o özellikte GİZLİ GÜCÜ olan (dış>öz) birini bulup isimli bir
// merak görevi üretir. Kör nokta kişinin YÜZÜNE ASLA VURULMAZ — görev yalnız
// "onun bu konuda güçlü olduğunu duydum, git sor" çerçevesiyle yazılır; kişinin
// KENDİ zayıflığından/farkından hiç söz edilmez, yalnız hedefin gücünden.
const JOHARI_ESIK = 1.5;

export type JohariGorev = { title: string; body: string; traitId: number; hedefId: string };

export async function johariCaprazGorevUret(
  db: Db,
  kisi: { id: string; full_name: string },
  simdi = new Date()
): Promise<JohariGorev | null> {
  const { data: kendiPuanlar } = await db
    .from("ratings")
    .select("trait_id, score, is_self")
    .eq("target_id", kisi.id);
  if (!kendiPuanlar || kendiPuanlar.length === 0) return null;

  const ort = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
  const ozlar = new Map<number, number[]>();
  const dislar = new Map<number, number[]>();
  for (const p of kendiPuanlar) {
    const harita = p.is_self ? ozlar : dislar;
    const arr = harita.get(p.trait_id) ?? [];
    arr.push(p.score);
    harita.set(p.trait_id, arr);
  }

  // En büyük kör nokta: öz puanı dış puandan JOHARI_ESIK ve üstü yüksek olan trait.
  let korNoktaTrait: number | null = null;
  let enBuyukFark = JOHARI_ESIK;
  for (const [traitId, ozArr] of ozlar) {
    const disArr = dislar.get(traitId);
    if (!disArr || disArr.length === 0) continue;
    const fark = ort(ozArr) - ort(disArr);
    if (fark >= enBuyukFark) {
      enBuyukFark = fark;
      korNoktaTrait = traitId;
    }
  }
  if (korNoktaTrait === null) return null;

  // Bu trait'te GİZLİ GÜCÜ olan (dış - öz ≥ eşik) roster'daki adaylar.
  const { data: traitPuanlar } = await db
    .from("ratings")
    .select("target_id, score, is_self")
    .eq("trait_id", korNoktaTrait)
    .neq("target_id", kisi.id);
  if (!traitPuanlar || traitPuanlar.length === 0) return null;

  const kisiOz = new Map<string, number[]>();
  const kisiDis = new Map<string, number[]>();
  for (const p of traitPuanlar) {
    const harita = p.is_self ? kisiOz : kisiDis;
    const arr = harita.get(p.target_id) ?? [];
    arr.push(p.score);
    harita.set(p.target_id, arr);
  }
  const adayIdler: string[] = [];
  for (const [pid, disArr] of kisiDis) {
    const ozArr = kisiOz.get(pid);
    if (!ozArr || ozArr.length === 0) continue;
    if (ort(disArr) - ort(ozArr) >= JOHARI_ESIK) adayIdler.push(pid);
  }
  if (adayIdler.length === 0) return null;

  const { data: adaylarHam } = await db
    .from("participants")
    .select("id, full_name, team")
    .in("id", adayIdler);
  const adaylar: EslesmeAday[] = adaylarHam ?? [];
  if (adaylar.length === 0) return null;

  const hedef = await eslesmeHedefiSec(db, kisi.id, adaylar, simdi);
  if (!hedef) return null;

  const { data: traitAdData } = await db
    .from("traits")
    .select("name")
    .eq("id", korNoktaTrait)
    .maybeSingle();
  const traitAd = traitAdData?.name ?? "bu konuda";

  return {
    title: `${hedef.full_name}'e merakını sor`,
    body: `${hedef.full_name}'in ${traitAd} yönü, kampın gözünde beklediğinden daha güçlü. Git ona sor: "${traitAd} konusunda bana ilham veren bir anını anlatır mısın?" Cevabından çıkardığın tek cümleyi bana yaz.`,
    traitId: korNoktaTrait,
    hedefId: hedef.id,
  };
}
