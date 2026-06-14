// #2 "Kamp Günü Akışı": adminin her kamp gününde sırayla yapması gereken
// kilit eylemler. Asistan (#7) tek sıradaki adımı önerir; bu ise günün TÜM
// adımlarını checklist olarak gösterir — admin programı ezberlemesin.

export type AkisAdimi = {
  // Programa bağlı saat (varsa); yoksa "gün içinde uygun olunca".
  saat?: string;
  etiket: string;
  // Panel içi çapa (#dalga, #ayna-ani) ya da başka admin sayfası yolu.
  href: string;
};

export const KAMP_ADMIN_AKISI: Record<1 | 2 | 3, AkisAdimi[]> = {
  1: [
    { etiket: "Dalga 1'i aç (ilk izlenim)", href: "#dalga" },
    { saat: "21:00", etiket: "Açılış Anonsu — AYNA kampı açar", href: "/admin/ayna-direktoru" },
  ],
  2: [
    { etiket: "Dalga 1'i kapat, Dalga 2'yi aç", href: "#dalga" },
    { saat: "13:30", etiket: "Senkron An — sahneyi yönet", href: "/admin/sahne-kumanda" },
    { saat: "23:20", etiket: "Ayna Anı — günün sayıları AYNA'nın sesiyle", href: "/admin/ayna-direktoru" },
  ],
  3: [
    { etiket: "Dalga 2'yi kapat, Dalga 3'ü aç", href: "#dalga" },
    { etiket: "Dalga 3'ü kapat (çoğu bitince)", href: "#dalga" },
    { etiket: "Ayna Raporlarını aç — kapanış 'wow' anı", href: "#ayna-ani" },
    { etiket: "Kapanış Sözünü aç", href: "/admin/sozler" },
  ],
};
