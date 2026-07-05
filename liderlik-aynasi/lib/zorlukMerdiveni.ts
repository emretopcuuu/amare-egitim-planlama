// Özellik 7 — ZORLUK MERDİVENİ (adaptif dozaj).
// Kişi × kas bazında konfor sınırını kişinin son görevlerinden öğrenir ve
// gorevUret'e "yukarı / aşağı / koru" sinyali verir. İlke: her görev sınırın
// BİR adım ötesine kurulur (%70 başarılabilir) — ne konfor içi, ne imkânsız.
// Saf fonksiyon: DB/AI çağrısı yok, girdi son ~15 görevin özetidir.

export type MerdivenGorev = {
  /** gorevUret'in deterministik seçtiği lider kası (missions.kas) */
  kas: string | null;
  ai_score: number | null;
  status: string;
  lightened_at: string | null;
  /** 'hafifletildi' | 'zorlastirildi' (missions.zorluk_ayar) */
  zorluk_ayar: string | null;
};

export type MerdivenSinyal = {
  yon: "yukari" | "asagi" | "koru";
  /** Prompta enjekte edilen kısa Türkçe direktif ("koru"da boş string). */
  aciklama: string;
};

/** Bir görevde "geri adım" izi var mı: hafifletme ya da süre dolması. */
function geriAdimMi(g: MerdivenGorev): boolean {
  return g.status === "expired" || !!g.lightened_at || g.zorluk_ayar === "hafifletildi";
}

/**
 * Kişinin son görevlerinden (en yeniden eskiye sıralı, ~15) hedef kas için
 * zorluk sinyali üretir:
 * - Son 3 AYNI-KAS puanlı görevin ortalaması ≥ 9 ve hiçbirinde hafifletme
 *   yoksa → "yukari" (konfor sınırı yükseldi, dozu artır).
 * - Son 5 görevin 2+ tanesinde geri adım (expired / hafifletme) varsa →
 *   "asagi" (basamak büyük gelmiş; daha kısa süre, daha tanıdık kişi,
 *   daha küçük sahne).
 * - Aksi halde → "koru".
 */
export function zorlukSeviyesiHesapla(
  sonGorevler: MerdivenGorev[],
  hedefKas: string
): MerdivenSinyal {
  // Aşağı sinyali önce bakılır — güven kırıldıysa yukarı itmek zarar verir.
  const son5 = sonGorevler.slice(0, 5);
  const geriAdimSayisi = son5.filter(geriAdimMi).length;
  if (geriAdimSayisi >= 2) {
    return {
      yon: "asagi",
      aciklama:
        "ZORLUK MERDİVENİ (AŞAĞI): Kişinin son görevlerinde kaçırma/hafifletme birikti — basamak büyük gelmiş. Bu görevi bir basamak KÜÇÜLT: daha kısa süre, daha tanıdık bir kişi, daha küçük bir sahne seç. Garantiye yakın bir başarı güveni geri kurar; sonra yeniden tırmanırız.",
    };
  }

  const ayniKasPuanli = sonGorevler.filter(
    (g) => g.kas === hedefKas && g.status === "scored" && typeof g.ai_score === "number"
  );
  const son3AyniKas = ayniKasPuanli.slice(0, 3);
  if (son3AyniKas.length >= 3) {
    const ort =
      son3AyniKas.reduce((t, g) => t + (g.ai_score ?? 0), 0) / son3AyniKas.length;
    const hafifletmeVar = son3AyniKas.some(
      (g) => !!g.lightened_at || g.zorluk_ayar === "hafifletildi"
    );
    if (ort >= 9 && !hafifletmeVar) {
      return {
        yon: "yukari",
        aciklama:
          "ZORLUK MERDİVENİ (YUKARI): Kişi bu lider kasını son görevlerde 9+/10 ile taşıdı ve hiç hafifletmedi — konfor sınırı yükseldi. Bu görevi bir basamak BÜYÜT: daha görünür bir sahne, daha az tanıdık bir kişi, biraz daha yüksek risk. Yine de %70 başarılabilir kalsın — imkânsız değil, tırmandıran.",
      };
    }
  }

  return { yon: "koru", aciklama: "" };
}
