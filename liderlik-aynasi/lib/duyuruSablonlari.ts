// #9 Hazır duyuru şablonları: admin elle metin yazmasın. Hem istemci (butonlar)
// hem sunucu (gönderilecek metin) aynı tanımı kullanır.
export type DuyuruSablonu = {
  anahtar: string;
  ikon: string;
  etiket: string;
  baslik: string;
  govde: string;
};

export const DUYURU_SABLONLARI: DuyuruSablonu[] = [
  {
    anahtar: "yemek",
    ikon: "🍽️",
    etiket: "Yemek vakti",
    baslik: "🍽️ Yemek vakti",
    govde: "Yemek hazır — restorana bekleniyorsunuz.",
  },
  {
    anahtar: "toplan",
    ikon: "📢",
    etiket: "Toplanın",
    baslik: "📢 Toplanma",
    govde: "Lütfen ana salonda toplanın.",
  },
  {
    anahtar: "ara",
    ikon: "▶️",
    etiket: "Ara bitti",
    baslik: "▶️ Ara bitti",
    govde: "Ara bitti, programa dönüyoruz.",
  },
  {
    anahtar: "sahne",
    ikon: "🎤",
    etiket: "Sahneye",
    baslik: "🎤 Sahne",
    govde: "Sahne sizi bekliyor — hazır olun.",
  },
];
