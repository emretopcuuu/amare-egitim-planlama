// #8 Proaktif uyarılar: admin aramasın, sistem söylesin. Mevcut durumdan
// dikkat isteyen kartları üretir (saf, yan etkisiz). Boşsa hiç gösterilmez.

export type Uyari = {
  ikon: string;
  mesaj: string;
  href: string;
  tip: "uyari" | "bilgi";
};

export function adminUyarilari(d: {
  acikDalgaAd: string | null;
  ozTamam: number;
  ozToplam: number;
  moderasyonBekleyen: number;
  silmeTalebi: number;
  kayanSayi?: number; // #4: sessizleşen (dürtülmüş) aday sayısı
}): Uyari[] {
  const u: Uyari[] = [];
  const eksik = d.ozToplam - d.ozTamam;

  // #4 Erken uyarı: aday(lar) sessizleşti → komutana yönlendir.
  if ((d.kayanSayi ?? 0) > 0) {
    u.push({
      ikon: "📉",
      mesaj: `${d.kayanSayi} aday sessizleşti — yeniden bağla`,
      href: "/admin/komutan",
      tip: "uyari",
    });
  }

  if (d.acikDalgaAd && d.ozToplam > 0) {
    const oran = d.ozTamam / d.ozToplam;
    if (oran >= 0.9) {
      u.push({
        ikon: "✅",
        mesaj: `${d.acikDalgaAd} %${Math.round(oran * 100)} bitti — kapatmaya hazır`,
        href: "#dalga",
        tip: "bilgi",
      });
    } else if (eksik > 0) {
      u.push({
        ikon: "⏳",
        mesaj: `${eksik} kişi henüz kendini puanlamadı`,
        href: "#ilerleme",
        tip: "uyari",
      });
    }
  }

  if (d.moderasyonBekleyen > 0) {
    u.push({
      ikon: "🖼️",
      mesaj: `${d.moderasyonBekleyen} fotoğraf moderasyon bekliyor`,
      href: "/admin/foto",
      tip: "uyari",
    });
  }

  if (d.silmeTalebi > 0) {
    u.push({
      ikon: "🗑️",
      mesaj: `${d.silmeTalebi} veri silme talebi var`,
      href: "#kvkk",
      tip: "uyari",
    });
  }

  return u;
}
