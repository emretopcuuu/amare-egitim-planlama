// Eşleştirme algoritması: her katılımcıya N gizli + M açık gözlem hedefi.
// İlkeler:
//  - Kimse kendini gözlemlemez, aynı kişiyi iki kez hedef almaz (tip fark etmeksizin).
//  - Farklı takımdan adaylar tercih edilir (takım körlüğünü kırmak için).
//  - Gelen gözlem yükü dengelenir: her turda en az gözlemlenen adaylar seçilir.
// Saf fonksiyon — DB erişimi yok, rastgelelik enjekte edilebilir (test edilebilirlik).

export type EslesmeKisi = { id: string; team: string | null };
export type Atama = {
  observer_id: string;
  target_id: string;
  type: "shadow" | "open";
};

function karistir<T>(dizi: T[], rastgele: () => number): T[] {
  const kopya = [...dizi];
  for (let i = kopya.length - 1; i > 0; i--) {
    const j = Math.floor(rastgele() * (i + 1));
    [kopya[i], kopya[j]] = [kopya[j], kopya[i]];
  }
  return kopya;
}

export function eslestir(
  kisiler: EslesmeKisi[],
  gizliSayisi: number,
  acikSayisi: number,
  rastgele: () => number = Math.random
): Atama[] {
  const atamalar: Atama[] = [];
  const gelenYuk = new Map<string, number>();
  const alinanHedefler = new Map<string, Set<string>>();
  for (const k of kisiler) {
    gelenYuk.set(k.id, 0);
    alinanHedefler.set(k.id, new Set());
  }

  // Tur tur ilerlenir (önce herkesin 1. hedefi, sonra 2. …): yük her turda
  // dengelenir, son gözlemciler hep aynı kişilere mahkûm kalmaz.
  const turlar: Atama["type"][] = [
    ...Array<Atama["type"]>(gizliSayisi).fill("shadow"),
    ...Array<Atama["type"]>(acikSayisi).fill("open"),
  ];

  for (const tip of turlar) {
    for (const gozlemci of karistir(kisiler, rastgele)) {
      const alinmis = alinanHedefler.get(gozlemci.id)!;
      const adaylar = kisiler.filter(
        (k) => k.id !== gozlemci.id && !alinmis.has(k.id)
      );
      if (adaylar.length === 0) continue; // küçük gruplarda hedef tükenebilir

      const farkliTakim = adaylar.filter(
        (k) => !k.team || !gozlemci.team || k.team !== gozlemci.team
      );
      const havuz = farkliTakim.length > 0 ? farkliTakim : adaylar;

      const enAzYuk = Math.min(...havuz.map((k) => gelenYuk.get(k.id)!));
      const enAzlar = havuz.filter((k) => gelenYuk.get(k.id) === enAzYuk);
      const secilen = enAzlar[Math.floor(rastgele() * enAzlar.length)];

      atamalar.push({
        observer_id: gozlemci.id,
        target_id: secilen.id,
        type: tip,
      });
      gelenYuk.set(secilen.id, enAzYuk + 1);
      alinmis.add(secilen.id);
    }
  }

  return atamalar;
}
