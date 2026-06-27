// KAMP PROVA SİMÜLATÖRÜ — adım haritası (yalnız metadata).
// Yürütme mantığı API rotasında (DB + AI gerektirir); burada her adımın ne
// olduğu, hangi fazda yer aldığı ve AI gerektirip gerektirmediği tanımlı.
// Admin sayfası ile rota bu tek listeyi paylaşır → tek doğruluk kaynağı.

export type SimAdim = {
  id: string;
  baslik: string;
  aciklama: string; // "İleri" deyince ne olacağı
  ikon: string;
  faz: string; // görsel gruplama
  ai?: boolean; // true → kişi kişi işlenen (batch'li) AI adımı
};

// Simülasyon durumu (settings'te JSON). İstemci kumandası ile sunucu motoru
// paylaşır; bu tip server-only olmayan modülde yaşasın ki istemci güvenle alsın.
export type SimDurum = {
  adim: number;
  ilerleme: number;
  log: { i: number; m: string; ts: string }[];
};

// AI adımlarında her "İleri" tıkında işlenen kişi sayısı. Netlify fonksiyon
// süre sınırını (≈26 sn) aşmamak için küçük tutulur; 20 kişi ≈ 5 tık.
export const SIM_BATCH = 4;
export const SIM_TOPLAM = 20;

export const SIM_ADIMLAR: SimAdim[] = [
  {
    id: "karakterler",
    baslik: "20 karakter üret",
    aciklama:
      "Dört persona hâline (A / A+ / B / C) dengeli dağılmış, takım ve şehir çeşitliliği olan 20 sanal katılımcı oluşturulur. Her birine 6 haneli giriş kodu verilir.",
    ikon: "🎭",
    faz: "Hazırlık",
  },
  {
    id: "pusula",
    baslik: "Pusula tamamlanır",
    aciklama:
      "Her karakter adına kariyer formu, 10 öncelik, çekirdek neden, iç engel ve slogan doldurulur (persona hâline uygun). Pusula mührü kapanır.",
    ikon: "🧭",
    faz: "Hazırlık",
  },
  {
    id: "eslestirme",
    baslik: "Eşleştirmeler kurulur",
    aciklama:
      "Gerçek eşleştirme algoritması sim kohortuna uygulanır: herkese 2 grup-içi + 2 grup-dışı gözlem hedefi atanır. Gerçek katılımcı atamalarına dokunulmaz.",
    ikon: "🔗",
    faz: "Hazırlık",
  },
  {
    id: "kamp_ac",
    baslik: "Kamp açılır (sim)",
    aciklama:
      "Yalnız sim katılımcılar için kamp kilidi açılır (camp_unlocked_at). Canlı kamp ekranları bu kişilere görünür olur.",
    ikon: "🔓",
    faz: "Hazırlık",
  },
  {
    id: "dalga1",
    baslik: "Dalga 1 + İlk İzlenim",
    aciklama:
      "Dalga 1 açılır. Her karakter önce kendini, sonra atandığı kişileri 10 özellik üzerinden puanlar (arketipe göre: cömert / sert / tutarlı / dağınık).",
    ikon: "🌊",
    faz: "Gün 1",
  },
  {
    id: "gorev1",
    baslik: "AYNA görev üretir — Gün 1",
    aciklama:
      "AYNA motoru (gerçek Opus üretimi) her karaktere kişiye özel bir görev verir. Persona + pusula + kariyer hâli görevin içeriğini şekillendirir.",
    ikon: "🤖",
    faz: "Gün 1",
    ai: true,
  },
  {
    id: "yanit1",
    baslik: "Görev yanıtları — Gün 1",
    aciklama:
      "Her karakter görevine arketipine uygun bir yanıt yazar; AYNA gerçek puanlama motoruyla (Opus + Haiku) yanıtı 1-10 puanlar ve yorum bırakır.",
    ikon: "✍️",
    faz: "Gün 1",
    ai: true,
  },
  {
    id: "dalga2",
    baslik: "Dalga 2 + Gözlem",
    aciklama:
      "Dalga 1 kapanır, Dalga 2 açılır. Karakterler ikinci kez puanlar; gözlem derinleştikçe puanlar ilk izlenimden ayrışır.",
    ikon: "🌊",
    faz: "Gün 2",
  },
  {
    id: "gorev2",
    baslik: "AYNA görev üretir — Gün 2",
    aciklama:
      "Gün 2 görevleri üretilir. Arc değişir: Gün 1 'gör/tanık ol' iken Gün 2 'yüzleş/çöz' temasına kayar.",
    ikon: "🤖",
    faz: "Gün 2",
    ai: true,
  },
  {
    id: "yanit2",
    baslik: "Görev yanıtları — Gün 2",
    aciklama: "Gün 2 görevleri yanıtlanır ve AYNA tarafından puanlanır.",
    ikon: "✍️",
    faz: "Gün 2",
    ai: true,
  },
  {
    id: "oyun",
    baslik: "Oyun seçimi → gruplar",
    aciklama:
      "Her karakter 2 oyun seçer ve en dolu olmayan Cumartesi grubuna (Grup 1–15) otomatik atanır. Takım alanı grup adıyla güncellenir.",
    ikon: "🎲",
    faz: "Gün 2",
  },
  {
    id: "dalga3",
    baslik: "Dalga 3 + Gerçek Algı",
    aciklama:
      "Son dalga açılır. Üç günün gözlemi olgunlaşır; final puanları girilir.",
    ikon: "🌊",
    faz: "Gün 3",
  },
  {
    id: "aynaesi",
    baslik: "Ayna Eşi seansları",
    aciklama:
      "Tamamlayıcı güç/gelişim alanlarına göre farklı takımlardan ikili eşler kurulur; akşam slotlarına yerleştirilir ve bir kısmı tamamlanmış işaretlenir.",
    ikon: "🪞",
    faz: "Gün 3",
  },
  {
    id: "muhur",
    baslik: "Raporlar + Mühür açılışı",
    aciklama:
      "Raporlar görünür kılınır ve mühür açılır. Karakterler artık kişisel Ayna Raporlarını görebilir.",
    ikon: "🔒",
    faz: "Final",
  },
  {
    id: "tamam",
    baslik: "Simülasyon tamamlandı",
    aciklama:
      "Tüm akış canlandı. Özet: ortalama puanlar, üretilen görevler, persona dağılımı. Buradan herhangi bir karakter olarak girip ekranlarını gezebilirsin.",
    ikon: "🏁",
    faz: "Final",
  },
];

export function adimBul(index: number): SimAdim | null {
  return SIM_ADIMLAR[index] ?? null;
}
