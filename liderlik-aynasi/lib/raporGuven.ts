// Ayna Raporu güven kuralı — saf, server-only DEĞİL (simülasyon test edebilsin).
//
// RİSK: Bir kişiyi yalnız 1-2 kişi puanlarsa, "dış algı" ortalaması istatistik
// olarak zayıftır ama rapor onu otoriter bir gerçek gibi gösterir → yanıltıcı/
// kırıcı sonuç. Eşik altında kalan raporlar "sınırlı yansıma" olarak işaretlenir;
// veri saklanmaz, yalnız güven düzeyi dürüstçe belirtilir.
//
// Kamp tasarımı her kişiye 2 gölge + 2 açık = 4 değerlendiren hedefler; eşik de
// 4. Altında kalırsa zarif ele alınır (çökme yok, abartılı kesinlik yok).

export const MIN_DEGERLENDIREN = 4;

// Bu kişiyi puanlayan FARKLI kişi sayısı eşiğin altında mı? (öz-puan sayılmaz)
export function dusukGuvenMi(degerlendirenSayisi: number): boolean {
  return degerlendirenSayisi < MIN_DEGERLENDIREN;
}
