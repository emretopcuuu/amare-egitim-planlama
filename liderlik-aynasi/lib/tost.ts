// #10 Admin eylem tostu + #3 gerçek "Geri Al": bir eylemden sonra "✓ yapıldı"
// geri bildirimi; istenirse tostun içinde tek dokunuşla geri alma butonu.
// İstemci tarafı yardımcı — AdminTost bileşeni bu olayı dinler ve gösterir.
export type TostTipi = "basari" | "hata" | "bilgi";

export function tost(mesaj: string, tip: TostTipi = "basari", geriAl?: () => void) {
  try {
    // CustomEvent detail aynı pencerede referansla geçer; fonksiyon korunur.
    window.dispatchEvent(
      new CustomEvent("admin-tost", { detail: { mesaj, tip, geriAl } })
    );
  } catch {
    // CustomEvent desteklenmiyorsa sessizce yok say
  }
}
