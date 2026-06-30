// KAMP ÖNCESİ ONBOARDING AKIŞ SIRASI — tek doğruluk kaynağı.
// Ana sayfa (app/page.tsx) bu saf fonksiyonla yönlendirme kararını verir;
// uçtan uca simülasyon (scripts/simulasyon.ts) aynı fonksiyonu test eder.
// "İki yerde iki ayrı doğruluk olmasın": sıralama burada kilitlenir.
//
// SIRA: 1) FOTO+SES RİTÜELİ → 2) OYUN SEÇİMİ → 3) PUSULA (öncelik+eleme+neden)
//       → 3b) HEDEF (neden keşfinden HEMEN sonra, otomatik) → 4) ÖN FARKINDALIK
//       → 5) MÜHÜR KAPISI (fiziksel giriş yapana dek /pusula hub'ında bekle)
//       → 6) KAMP İÇİ HEDEF (admin bayrağı açıkken).
// Her kapı bir öncekinin tamamlanmasını bekler.

export type AkisDurum = {
  // Katılımcı durumu
  sesVar: boolean; // ses/foto ritüeli kaydı var mı (ya da "sessiz" seçildi)
  team: string | null; // atanmış grup
  campUnlocked: boolean; // kampa fiziksel giriş yapıldı mı
  degerlerTamam: boolean; // değerler çalışması (değer keşfi + neden) tamamlandı mı
  pusulaTamam: boolean; // pusula (neden keşfi) tamamlandı mı
  hedefTamam: boolean; // kariyer hedefi mühürlendi mi
  ofTamam: boolean; // ön farkındalık tamamlandı mı
  // Admin pencereleri (settings)
  oyunSecimiAcik: boolean;
  degerlerAcik: boolean;
  pusulaAcik: boolean;
  onFarkindalikAcik: boolean;
  // Kamp içi hedef penceresi açık + kişi henüz bitirmemiş (hedefKapisiAcik sonucu)
  kampIciHedefKapisi: boolean;
};

export type AkisAdim =
  | { tip: "rituel" } // ses/foto ritüelini göster (redirect değil, render)
  | { tip: "yonlendir"; yol: string } // bu yola yönlendir
  | { tip: "devam" }; // kapı yok — ana akışa (durum makinesi) devam et

// Kişinin yolculuğunun neresinde olduğuna göre TEK bir sonraki adımı döndürür.
export function kampOncesiAdim(d: AkisDurum): AkisAdim {
  // 1) FOTO + SES RİTÜELİ — Yansıman'ın doğuşu. Her şeyden önce gelir.
  if (!d.sesVar) return { tip: "rituel" };

  // 2) OYUN SEÇİMİ — seçim açıkken grubu olmayan kişi önce oyununu seçer.
  if (d.oyunSecimiAcik && !d.team) return { tip: "yonlendir", yol: "/oyun-secimi" };

  // 2b) DEĞERLER ÇALIŞMASI — Pusula'daki nedenlerden HEMEN ÖNCE. Değer keşfi +
  //     5-neden derinleşmesi. ZORUNLU: kamp açık olsa bile atlanamaz.
  if (d.degerlerAcik && !d.degerlerTamam) {
    return { tip: "yonlendir", yol: "/degerler" };
  }

  // 3) PUSULA — 10 öncelik → eleme → neden keşfi. Tamamlanana dek bu kapıda kalır.
  //    ZORUNLU: kamp açık/girilmiş olsa BİLE (sonradan katılan dahil) bu adım
  //    atlanamaz — onboarding'ini yapmadan kimse kampa giremez.
  if (d.pusulaAcik && !d.pusulaTamam) {
    return { tip: "yonlendir", yol: "/pusula" };
  }

  // 3b) HEDEF (kamp öncesi, otomatik) — Pusula neden keşfi biter bitmez ayrı
  // admin bayrağı gerekmeksizin devreye girer. Bitene dek bu kapıda kalır.
  // ZORUNLU: kamp açık olsa bile tamamlanmadan geçilemez.
  if (d.pusulaTamam && !d.hedefTamam) {
    return { tip: "yonlendir", yol: "/hedef" };
  }

  // 4) ÖN FARKINDALIK — Pusula + Hedef tamamlandıktan sonra.
  // ZORUNLU: kamp açık olsa bile tamamlanmadan geçilemez.
  if (d.onFarkindalikAcik && !d.ofTamam) {
    return { tip: "yonlendir", yol: "/on-farkindalik" };
  }

  // 5) MÜHÜR KAPISI — kamp ritüeli açıkken fiziksel giriş yapmamış kişi (pusula/ÖF
  // bitmiş olsa bile) kamp içeriğini görmez; hazırlık hub'ında (/pusula) bekler.
  if (d.pusulaAcik && !d.campUnlocked) {
    return { tip: "yonlendir", yol: "/pusula" };
  }

  // 6) KAMP İÇİ HEDEF KAPISI — kampa girmiş kişi, admin hedef penceresi açıkken
  // ve henüz hedef belirlemediyse yönlendirilir.
  if (d.campUnlocked && d.kampIciHedefKapisi) {
    return { tip: "yonlendir", yol: "/hedef" };
  }

  return { tip: "devam" };
}
