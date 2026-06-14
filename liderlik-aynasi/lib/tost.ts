// #10 Admin eylem tostu: bir eylemden sonra "✓ yapıldı" geri bildirimi.
// İstemci tarafı yardımcı — AdminTost bileşeni bu olayı dinler ve gösterir.
export type TostTipi = "basari" | "hata" | "bilgi";

export function tost(mesaj: string, tip: TostTipi = "basari") {
  try {
    window.dispatchEvent(new CustomEvent("admin-tost", { detail: { mesaj, tip } }));
  } catch {
    // CustomEvent desteklenmiyorsa sessizce yok say
  }
}
