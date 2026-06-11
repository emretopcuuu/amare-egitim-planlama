import "server-only";
import type { Db } from "@/lib/degerlendirme";
import { aktifOzellikler } from "@/lib/degerlendirme";

// Ayna Raporu veri montajı: bir katılımcının tüm dalgalardaki öz ve dış
// puanlarını tek yapıda toplar. /ayna sayfası ve AI mektup üretimi aynı
// hesabı kullanır (iki yerde iki ayrı doğruluk olmasın).

export type RaporSatiri = {
  ozellikId: number;
  ad: string;
  oz: number | null; // öz puan ortalaması (tüm dalgalar)
  dis: number | null; // dış puan ortalaması (tüm dalgalar)
  disSayi: number; // bu özelliğe dış puan veren değerlendirme sayısı
};

export type DalgaOzeti = {
  dalgaId: number;
  ad: string;
  genelOrtalama: number | null; // tüm özelliklerde dış ortalama
  ozellikOrtalama: Map<number, number>; // ozellikId -> dış ortalama
};

export type RaporYorumu = {
  ozellikAd: string;
  dalga: number;
  puan: number;
  yorum: string;
};

export type Rapor = {
  satirlar: RaporSatiri[];
  guclu: RaporSatiri[]; // en yüksek 3 dış ortalama
  gelisim: RaporSatiri[]; // en düşük 3 dış ortalama
  gizliGuc: RaporSatiri | null; // dis - oz >= ESIK
  korNokta: RaporSatiri | null; // oz - dis >= ESIK
  dalgalar: DalgaOzeti[];
  enGelisen: { ad: string; fark: number } | null; // ilk→son dalga dış farkı
  yorumlar: RaporYorumu[];
  tahmin: { topId: number; bottomId: number } | null;
  gercekTopId: number | null;
  gercekBottomId: number | null;
};

const JOHARI_ESIK = 1.5;

function ortalama(toplam: number, adet: number): number | null {
  return adet > 0 ? toplam / adet : null;
}

export async function raporHesapla(db: Db, katilimciId: string): Promise<Rapor> {
  const [ozellikler, puanlarSonuc, dalgalarSonuc, tahminSonuc] =
    await Promise.all([
      aktifOzellikler(db),
      db
        .from("ratings")
        .select("trait_id, wave, score, comment, is_self, is_hidden")
        .eq("target_id", katilimciId),
      db.from("waves").select("id, name").order("id"),
      db
        .from("predictions")
        .select("top_trait_id, bottom_trait_id")
        .eq("participant_id", katilimciId)
        .maybeSingle(),
    ]);
  if (puanlarSonuc.error) throw puanlarSonuc.error;
  if (dalgalarSonuc.error) throw dalgalarSonuc.error;
  if (tahminSonuc.error) throw tahminSonuc.error;

  const puanlar = puanlarSonuc.data;
  const ozellikAd = new Map(ozellikler.map((o) => [o.id, o.name]));

  // Özellik bazında öz/dış toplamları + dalga bazında dış toplamlar
  const ozToplam = new Map<number, { t: number; n: number }>();
  const disToplam = new Map<number, { t: number; n: number }>();
  const dalgaDis = new Map<number, Map<number, { t: number; n: number }>>();

  for (const p of puanlar) {
    const hedefMap = p.is_self ? ozToplam : disToplam;
    const kayit = hedefMap.get(p.trait_id) ?? { t: 0, n: 0 };
    kayit.t += p.score;
    kayit.n += 1;
    hedefMap.set(p.trait_id, kayit);

    if (!p.is_self) {
      const dalgaMap = dalgaDis.get(p.wave) ?? new Map();
      const dk = dalgaMap.get(p.trait_id) ?? { t: 0, n: 0 };
      dk.t += p.score;
      dk.n += 1;
      dalgaMap.set(p.trait_id, dk);
      dalgaDis.set(p.wave, dalgaMap);
    }
  }

  const satirlar: RaporSatiri[] = ozellikler.map((o) => {
    const oz = ozToplam.get(o.id);
    const dis = disToplam.get(o.id);
    return {
      ozellikId: o.id,
      ad: o.name,
      oz: oz ? ortalama(oz.t, oz.n) : null,
      dis: dis ? ortalama(dis.t, dis.n) : null,
      disSayi: dis?.n ?? 0,
    };
  });

  const disOlanlar = satirlar.filter((s) => s.dis !== null);
  const siralanmis = [...disOlanlar].sort((a, b) => b.dis! - a.dis!);
  const guclu = siralanmis.slice(0, 3);
  const gelisim = siralanmis.slice(-3).reverse();

  // Johari: en büyük pozitif/negatif öz-dış farkı (eşik üstüyse)
  let gizliGuc: RaporSatiri | null = null;
  let korNokta: RaporSatiri | null = null;
  for (const s of satirlar) {
    if (s.oz === null || s.dis === null) continue;
    const fark = s.dis - s.oz;
    if (fark >= JOHARI_ESIK && (!gizliGuc || fark > gizliGuc.dis! - gizliGuc.oz!)) {
      gizliGuc = s;
    }
    if (-fark >= JOHARI_ESIK && (!korNokta || -fark > korNokta.oz! - korNokta.dis!)) {
      korNokta = s;
    }
  }

  // Dalga yolculuğu (yalnızca dış puan almış dalgalar)
  const dalgalar: DalgaOzeti[] = dalgalarSonuc.data
    .filter((d) => dalgaDis.has(d.id))
    .map((d) => {
      const m = dalgaDis.get(d.id)!;
      let t = 0;
      let n = 0;
      const ozellikOrtalama = new Map<number, number>();
      for (const [ozellikId, k] of m) {
        ozellikOrtalama.set(ozellikId, k.t / k.n);
        t += k.t;
        n += k.n;
      }
      return { dalgaId: d.id, ad: d.name, genelOrtalama: ortalama(t, n), ozellikOrtalama };
    });

  let enGelisen: Rapor["enGelisen"] = null;
  if (dalgalar.length >= 2) {
    const ilk = dalgalar[0].ozellikOrtalama;
    const son = dalgalar[dalgalar.length - 1].ozellikOrtalama;
    for (const [ozellikId, sonOrt] of son) {
      const ilkOrt = ilk.get(ozellikId);
      if (ilkOrt === undefined) continue;
      const fark = sonOrt - ilkOrt;
      if (fark > 0 && (!enGelisen || fark > enGelisen.fark)) {
        enGelisen = { ad: ozellikAd.get(ozellikId) ?? "", fark };
      }
    }
  }

  const yorumlar: RaporYorumu[] = puanlar
    .filter((p) => !p.is_self && !p.is_hidden && p.comment)
    .map((p) => ({
      ozellikAd: ozellikAd.get(p.trait_id) ?? "",
      dalga: p.wave,
      puan: p.score,
      yorum: p.comment!,
    }))
    .sort((a, b) => a.dalga - b.dalga || a.ozellikAd.localeCompare(b.ozellikAd, "tr-TR"));

  return {
    satirlar,
    guclu,
    gelisim,
    gizliGuc,
    korNokta,
    dalgalar,
    enGelisen,
    yorumlar,
    tahmin: tahminSonuc.data
      ? { topId: tahminSonuc.data.top_trait_id, bottomId: tahminSonuc.data.bottom_trait_id }
      : null,
    gercekTopId: siralanmis[0]?.ozellikId ?? null,
    gercekBottomId: siralanmis[siralanmis.length - 1]?.ozellikId ?? null,
  };
}

export async function raporlarGorunurMu(db: Db): Promise<boolean> {
  const { data, error } = await db
    .from("settings")
    .select("value")
    .eq("key", "reports_visible")
    .maybeSingle();
  if (error) throw error;
  return data?.value === "true";
}
