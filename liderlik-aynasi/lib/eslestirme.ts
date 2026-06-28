// Eşleştirme algoritması: her katılımcıya iki katman gözlem hedefi —
//  - GRUP-İÇİ (yakın ayna): kendi takımından kişiler. Seni en çok görenler.
//  - GRUP-DIŞI (uzak ayna): farklı takımlardan kişiler. Taze/objektif bakış.
// İlkeler:
//  - Kimse kendini gözlemlemez, aynı kişiyi iki kez hedef almaz.
//  - Gelen gözlem yükü dengelenir: her turda en az gözlemlenen adaylar seçilir.
//  - Havuz yetmezse (küçük grup) eksik, diğer havuzdan tamamlanır (kimse açıkta kalmaz).
// Tüm atamalar "shadow" (gizli) — gözlenen kişi kimin puanladığını bilmez.
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

/** "a|b" ya da "b|a" formatında olan bir çifti dışlama setinde ara (çift yönlü). */
function dislandi(dislamalar: Set<string>, aId: string, bId: string): boolean {
  return dislamalar.has(`${aId}|${bId}`) || dislamalar.has(`${bId}|${aId}`);
}

export function eslestir(
  kisiler: EslesmeKisi[],
  grupIciSayisi: number,
  grupDisiSayisi: number,
  rastgele: () => number = Math.random,
  /** "aId|bId" ya da "bId|aId" — çift yönlü dışlama çiftleri. */
  dislamalar: Set<string> = new Set()
): Atama[] {
  const atamalar: Atama[] = [];
  const gelenYuk = new Map<string, number>();
  const alinan = new Map<string, Set<string>>();
  for (const k of kisiler) {
    gelenYuk.set(k.id, 0);
    alinan.set(k.id, new Set());
  }

  function sec(gozlemci: EslesmeKisi, havuz: EslesmeKisi[]): EslesmeKisi | null {
    const uygun = havuz.filter(
      (k) =>
        k.id !== gozlemci.id &&
        !alinan.get(gozlemci.id)!.has(k.id) &&
        !dislandi(dislamalar, gozlemci.id, k.id)
    );
    if (uygun.length === 0) return null;
    const enAz = Math.min(...uygun.map((k) => gelenYuk.get(k.id)!));
    const enAzlar = uygun.filter((k) => gelenYuk.get(k.id) === enAz);
    return enAzlar[Math.floor(rastgele() * enAzlar.length)];
  }
  function ata(gozlemci: EslesmeKisi, secilen: EslesmeKisi) {
    atamalar.push({ observer_id: gozlemci.id, target_id: secilen.id, type: "shadow" });
    gelenYuk.set(secilen.id, gelenYuk.get(secilen.id)! + 1);
    alinan.get(gozlemci.id)!.add(secilen.id);
  }

  const ayniTakim = (a: EslesmeKisi, b: EslesmeKisi) =>
    !!a.team && !!b.team && a.team === b.team;

  for (let tur = 0; tur < grupIciSayisi; tur++) {
    for (const g of karistir(kisiler, rastgele)) {
      const havuz = kisiler.filter((k) => ayniTakim(k, g));
      const s = sec(g, havuz);
      if (s) ata(g, s);
    }
  }
  for (let tur = 0; tur < grupDisiSayisi; tur++) {
    for (const g of karistir(kisiler, rastgele)) {
      const havuz = kisiler.filter((k) => !ayniTakim(k, g));
      const s = sec(g, havuz);
      if (s) ata(g, s);
    }
  }

  const hedefToplam = grupIciSayisi + grupDisiSayisi;
  for (const g of karistir(kisiler, rastgele)) {
    while (alinan.get(g.id)!.size < hedefToplam) {
      const s = sec(g, kisiler);
      if (!s) break;
      ata(g, s);
    }
  }

  return atamalar;
}

/**
 * Artımlı eşleştirme: yalnızca hedef sayısının altında atama olan kişileri tamamlar.
 * Mevcut atamalar korunur, sadece eksik olanlar eklenir.
 */
export function eslestirEkle(
  kisiler: EslesmeKisi[],
  mevcutAtamalar: { observer_id: string; target_id: string }[],
  grupIciSayisi: number,
  grupDisiSayisi: number,
  rastgele: () => number = Math.random,
  dislamalar: Set<string> = new Set()
): Atama[] {
  const hedefToplam = grupIciSayisi + grupDisiSayisi;
  const gelenYuk = new Map<string, number>();
  const alinan = new Map<string, Set<string>>();
  for (const k of kisiler) {
    gelenYuk.set(k.id, 0);
    alinan.set(k.id, new Set());
  }
  for (const a of mevcutAtamalar) {
    alinan.get(a.observer_id)?.add(a.target_id);
    gelenYuk.set(a.target_id, (gelenYuk.get(a.target_id) ?? 0) + 1);
  }

  const yeniAtamalar: Atama[] = [];

  function sec(gozlemci: EslesmeKisi, havuz: EslesmeKisi[]): EslesmeKisi | null {
    const uygun = havuz.filter(
      (k) =>
        k.id !== gozlemci.id &&
        !alinan.get(gozlemci.id)!.has(k.id) &&
        !dislandi(dislamalar, gozlemci.id, k.id)
    );
    if (uygun.length === 0) return null;
    const enAz = Math.min(...uygun.map((k) => gelenYuk.get(k.id)!));
    const enAzlar = uygun.filter((k) => gelenYuk.get(k.id) === enAz);
    return enAzlar[Math.floor(rastgele() * enAzlar.length)];
  }
  function ata(gozlemci: EslesmeKisi, secilen: EslesmeKisi) {
    yeniAtamalar.push({ observer_id: gozlemci.id, target_id: secilen.id, type: "shadow" });
    gelenYuk.set(secilen.id, gelenYuk.get(secilen.id)! + 1);
    alinan.get(gozlemci.id)!.add(secilen.id);
  }

  const ayniTakim = (a: EslesmeKisi, b: EslesmeKisi) =>
    !!a.team && !!b.team && a.team === b.team;

  // Eksik kişileri karıştırılmış sırada işle — yük dengesi için
  for (const g of karistir(kisiler, rastgele)) {
    const mevcut = alinan.get(g.id)!.size;
    if (mevcut >= hedefToplam) continue;

    // Önce grup-içi doldur
    const iciBos = Math.max(0, grupIciSayisi - [...alinan.get(g.id)!].filter((id) => {
      const hedef = kisiler.find((k) => k.id === id);
      return hedef ? ayniTakim(g, hedef) : false;
    }).length);

    for (let i = 0; i < iciBos; i++) {
      const havuz = kisiler.filter((k) => ayniTakim(k, g));
      const s = sec(g, havuz);
      if (s) ata(g, s);
    }

    // Sonra grup-dışı doldur
    const disiBos = Math.max(0, grupDisiSayisi - [...alinan.get(g.id)!].filter((id) => {
      const hedef = kisiler.find((k) => k.id === id);
      return hedef ? !ayniTakim(g, hedef) : false;
    }).length);

    for (let i = 0; i < disiBos; i++) {
      const havuz = kisiler.filter((k) => !ayniTakim(k, g));
      const s = sec(g, havuz);
      if (s) ata(g, s);
    }

    // Havuz yetmediyse herkesten tamamla
    while (alinan.get(g.id)!.size < hedefToplam) {
      const s = sec(g, kisiler);
      if (!s) break;
      ata(g, s);
    }
  }

  return yeniAtamalar;
}
