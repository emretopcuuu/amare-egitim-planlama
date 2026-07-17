// G1 — market KATALOĞU (saf veri + tip; server-only DEĞİL). İstemci bileşenleri
// (MarketReyonlar) ve sunucu (lib/market.ts) ortak buradan okur — server-only
// modülü istemci paketine sızmasın diye ayrıldı.

export type Reyon = "bilgi" | "sosyal" | "kisisel" | "konfor" | "prestij";

export type MarketUrun = {
  kod: string;
  ad: string;
  aciklama: string;
  fiyat: number;
  reyon: Reyon;
  fiziksel?: boolean; // prestij: admin teslim listesine düşer
  varyantlar?: { kod: string; ad: string; renk?: string }[]; // seçenekli ürün
  // Satıştan kaldırıldı: markette listelenmez ve yeni satın alma reddedilir;
  // tanım DURUR ki geçmiş işlemler (admin teslim listesi vb.) adıyla görünsün.
  satistaDegil?: boolean;
};

export const REYON_BASLIK: Record<Reyon, { ad: string; ikon: string }> = {
  bilgi: { ad: "Bilgi", ikon: "🔍" },
  sosyal: { ad: "Sosyal Jest", ikon: "💛" },
  kisisel: { ad: "Kişiselleştirme", ikon: "🎨" },
  konfor: { ad: "Konfor", ikon: "🛋️" },
  prestij: { ad: "Prestij", ikon: "🏛️" },
};

// Elmas ışık rengi seçenekleri (5) — KimlikElmasi hâlesi bu rengi kullanır.
export const ELMAS_RENKLERI: { kod: string; ad: string; renk: string }[] = [
  { kod: "altin", ad: "Altın", renk: "212,175,55" },
  { kod: "gok", ad: "Gök Mavisi", renk: "96,165,250" },
  { kod: "zumrut", ad: "Zümrüt", renk: "52,211,153" },
  { kod: "gul", ad: "Gül", renk: "244,114,182" },
  { kod: "mor", ad: "Ametist", renk: "167,139,250" },
];

// Fiyatlar Emre'nin onayına açık (bitiş raporunda karar noktası).
export const MARKET_URUNLERI: MarketUrun[] = [
  // — Bilgi —
  { kod: "fragman_erken", reyon: "bilgi", fiyat: 5, ad: "Fragman ipucunu erken aç", aciklama: "Sıradaki görevin kilitli ipucunu şimdi gör." },
  { kod: "yarin_tur", reyon: "bilgi", fiyat: 8, ad: "Yarınki görev türünü öğren", aciklama: "Yarın hangi tür görev geleceğini önceden bil." },
  // — Sosyal jest —
  { kod: "altin_cerceve", reyon: "sosyal", fiyat: 15, ad: "Takdiri altın çerçeveyle gönder", aciklama: "Bir sonraki takdirin duvarda altın çerçeveyle parlar." },
  { kod: "fisilti_arti", reyon: "sosyal", fiyat: 10, ad: "+1 fısıltı hakkı", aciklama: "Bugün bir fısıltı daha gönder." },
  { kod: "sandik_hediye", reyon: "sosyal", fiyat: 20, ad: "Arkadaşına sandık hediye et", aciklama: "Seçtiğin bir kişiye gizemli sandık gönder." },
  // — Kişiselleştirme —
  { kod: "elmas_rengi", reyon: "kisisel", fiyat: 25, ad: "Elmas ışık rengi", aciklama: "Elmasının ışığını 5 renkten biriyle değiştir.", varyantlar: ELMAS_RENKLERI },
  { kod: "profil_cerceve", reyon: "kisisel", fiyat: 30, ad: "Profil çerçevesi / unvan vitrini", aciklama: "Profilinde unvanını özel çerçeveyle sergile." },
  // — Konfor —
  { kod: "sure_jetonu", reyon: "konfor", fiyat: 12, ad: "Görev süresi +1 saat jetonu", aciklama: "Bir görevin süresini 1 saat uzat." },
  { kod: "uc_kapi", reyon: "konfor", fiyat: 8, ad: "İki Kapı'yı üç kapıya çıkar", aciklama: "Bir sonraki seçimli görevde 3 seçenek gör." },
  // — Prestij (FİZİKSEL — admin onaylı teslim) —
  { kod: "ad_anonsu", reyon: "prestij", fiyat: 150, fiziksel: true, ad: "Kapanışta ad anonsu", aciklama: "Kapanış sahnesinde adın anons edilir." },
  { kod: "on_sira", reyon: "prestij", fiyat: 100, fiziksel: true, ad: "Akşam oturumu ön sıra", aciklama: "Bir akşam oturumunda ön sıra koltuğu." },
  // Emre'nin talebiyle (Gün 1 akşamı) satıştan kaldırıldı — tanım, önceki tek
  // satın almanın (teslim listesinde) adıyla görünmeye devam etmesi için duruyor.
  { kod: "emre_birebir", reyon: "prestij", fiyat: 300, fiziksel: true, satistaDegil: true, ad: "Emre ile 30 dk birebir", aciklama: "Emre Topçu ile 30 dakikalık birebir görüşme." },
];

// Markette listelenen (satın alınabilir) ürünler.
export const SATISTAKI_URUNLER: MarketUrun[] = MARKET_URUNLERI.filter((u) => !u.satistaDegil);

export function urunBul(kod: string): MarketUrun | null {
  return MARKET_URUNLERI.find((u) => u.kod === kod) ?? null;
}
