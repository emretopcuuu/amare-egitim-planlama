// 90 GÜN PROTOKOLÜ — saf tanım modülü (server-only DEĞİL; hem /protokol sayfası
// hem sunucu motoru buradan okur). Kamp sonrası yolculuk modunda AYNA bu 10
// pratiği kişiselleştirip günlük ritme işler. Guardrail: davet, zorunluluk değil;
// her pratik tek dokunuşla kapatılabilir; suçluluk sopası yok; klinik alan yok.

export type PratikKodu =
  | "P1" | "P2" | "P3" | "P4" | "P5" | "P6" | "P7" | "P8" | "P9" | "P10";

// Günün hangi bloğunda üretilir (yolculuk ritmi): sabah / gün / akşam / haftalik.
export type Blok = "sabah" | "gun" | "aksam" | "haftalik";

export type Pratik = {
  kod: PratikKodu;
  ad: string;
  ikon: string;
  blok: Blok;
  // Kısa açıklama (kart + görev bağlamı).
  ozet: string;
  // "Bu pratik neden SENDE" — iç engele bağlanan tek cümle (kişiye kartta gösterilir).
  nedenSende: string;
  // Görev üretiminde AI'a verilecek yönerge fragmanı (yolculuk görevini bu pratiğe demirler).
  gorevYonerge: string;
  // Tahmini günlük süre (dk) — toplam yük ≤20 dk hedefi için.
  sureDk: number;
};

// Çekirdek 4: herkese (P9 yalnız çekirdek nedeni aile olanlarda çekirdek sayılır).
export const CEKIRDEK_PRATIKLER: PratikKodu[] = ["P1", "P6", "P10"];

export const PRATIKLER: Record<PratikKodu, Pratik> = {
  P1: {
    kod: "P1", ad: "Kanıt Günlüğü", ikon: "📓", blok: "aksam", sureDk: 2,
    ozet: "Her akşam tek cümle: bugün YAPTIĞIN tek şey (his değil, eylem).",
    nedenSende: "Zihin 'yetersizim' inancını doğrulayan kanıtı saklar, aksini siler. Yazılı kanıt bu filtreyi atlar.",
    gorevYonerge: "KANIT GÜNLÜĞÜ görevi: kişiden bugün YAPTIĞI tek somut şeyi tek cümleyle yazmasını iste — his değil, eylem ('bugün ... yaptım'). Kısa, baskısız. Biriken kanıtlar 30/60/90. günde geri okunacak.",
  },
  P2: {
    kod: "P2", ad: "90 Saniye Ateşlemesi", ikon: "🔥", blok: "sabah", sureDk: 2,
    ozet: "Günün en belirsiz işinin İLK fiziksel adımını 90 saniyede at.",
    nedenSende: "Netlik eylemi doğurmaz; eylem netliği doğurur. Belirsizlik ancak ilk adımla dağılır.",
    gorevYonerge: "90 SANİYE ATEŞLEMESİ görevi: kişiden günün en belirsiz işinin İLK fiziksel adımını (telefonu al, ilk cümleyi yaz, numarayı çevir) 90 saniye içinde atmasını ve bana tek satır yazmasını iste. Planlamayı eylemden SONRAYA bırak.",
  },
  P3: {
    kod: "P3", ad: "Günde Bir Devir", ikon: "🤲", blok: "gun", sureDk: 3,
    ozet: "Bugün tek bir işi devret; mükemmel olmamasına izin ver.",
    nedenSende: "Kontrol bırakmak karar değil, kastır; tekrar büyütür. Her şeyi kendin yaparsan ekip değil, iş üretirsin.",
    gorevYonerge: "GÜNDE BİR DEVİR görevi: kişiden bugün tek bir işi bilinçli olarak başkasına devretmesini — ve o işin mükemmel yapılmamasına izin verdiği yeri yazmasını iste. Küçük başlasın (bir mesaj, bir takip).",
  },
  P4: {
    kod: "P4", ad: "Görünürlük Dozu", ikon: "🎤", blok: "gun", sureDk: 3,
    ozet: "Bugünün küçük sahnesi: story / toplantıda ilk söz / bir kişiye hikâyeni anlat.",
    nedenSende: "Görünme korkusu düşünerek değil, maruz kalarak söner. Kas kullanılan yerde büyür.",
    gorevYonerge: "GÖRÜNÜRLÜK DOZU görevi: kişiden bugün bir kez küçük sahneye çıkmasını (bir story paylaş, toplantıda İLK konuşan ol, bir kişiye kendi hikâyeni anlat) ve hangisini yaptığını yazmasını iste. Günde bir, ama her gün.",
  },
  P5: {
    kod: "P5", ad: "Önce Sen Gör", ikon: "👁", blok: "gun", sureDk: 3,
    ozet: "Bir kişiye spesifik takdir: isim + gördüğün davranış + sende bıraktığı etki.",
    nedenSende: "Liderlik görülmek değil, görme işidir. Göremeyen ekip büyütemez.",
    gorevYonerge: "ÖNCE SEN GÖR görevi: kişiden bugün bir kişiye ÜÇ PARÇALI spesifik takdir yazmasını iste (isim + gördüğün davranış + sende bıraktığı etki). 'Harikasın' değil; somut. Uygulamadaki Takdir'e yönlendir.",
  },
  P6: {
    kod: "P6", ad: "Artı Üç", ikon: "➕", blok: "gun", sureDk: 2,
    ozet: "Listene 3 yeni isim ekle — arama, sadece ekle.",
    nedenSende: "'Kime gideceğim' kaygısının kaynağı cesaret değil, boş boru hattı. Dolu liste korkuyu düşürür.",
    gorevYonerge: "ARTI ÜÇ görevi: kişiden bugün listesine 3 YENİ isim eklemesini iste (arama değil, sadece ekleme). İSİM SİSTEME GİRİLMEZ — yalnız 'bugün 3 eklendi mi?' sorulur, sayaç tutulur.",
  },
  P7: {
    kod: "P7", ad: "Hayır Koleksiyonu", ikon: "🏆", blok: "haftalik", sureDk: 3,
    ozet: "Bu hafta en az 3 HAYIR topla — evet değil, hayır.",
    nedenSende: "Hedefi 'evet almak'tan 'hayır toplamak'a çevirince ret başarısızlık değil, hedefe atılan puan olur.",
    gorevYonerge: "HAYIR KOLEKSİYONU görevi: kişiye bu hafta en az 3 HAYIR toplamayı hatırlat (evet değil, hayır); her hayırı not etsin. Kutlama dili kullan ('3/3 — koleksiyon tamam 🏆'), suçlama yok.",
  },
  P8: {
    kod: "P8", ad: "Kapanış Nefesi + Yarın Cümlesi", ikon: "🌙", blok: "aksam", sureDk: 2,
    ozet: "3 uzun nefes + yarının TEK önceliğini tek cümle yaz, sonra bırak.",
    nedenSende: "Ateşin gerçek — ama irade uykuda yenilenir. Nefes onarım moduna geçirir; yarın cümlesi açık sekmeleri kapatır.",
    gorevYonerge: "KAPANIŞ NEFESİ görevi: kişiden 3 uzun nefes almasını (burundan al, ağızdan uzun ver — RAHATLAMA dilinde, sağlık/terapi vaadi YOK) ve yarının TEK önceliğini tek cümle yazmasını iste. Sonra bıraksın.",
  },
  P9: {
    kod: "P9", ad: "Sabah Anlaşması", ikon: "🌅", blok: "sabah", sureDk: 2,
    ozet: "Nedenine bak, sesli söyle: 'Bugün senin SAYENDE — bugünkü adımım: ___'.",
    nedenSende: "'Onlar için' cümlesi fedakârlık yorgunluğuna döner; 'onlar sayemde' aynı yakıtı sahiplenmeye çevirir.",
    gorevYonerge: "SABAH ANLAŞMASI görevi: kişinin çekirdek nedeni ekranda; ondan 'Bugün senin İÇİN değil, senin SAYENDE — bugünkü adımım: ___' cümlesini doldurmasını iste. Doldurduğu adım o günün odağı olsun.",
  },
  P10: {
    kod: "P10", ad: "Pazar Karnesi", ikon: "📊", blok: "haftalik", sureDk: 5,
    ozet: "Her Pazar üç sayı: bu hafta kaç davet, kaç görüşme, kaç takip.",
    nedenSende: "Hedef ilham verir ama davranışı sayı yönetir. Sözün bir tanığı olduğunda tutulma ihtimali katlanır.",
    gorevYonerge: "PAZAR KARNESİ görevi: kişiden bu haftanın üç sayısını iste — kaç davet, kaç görüşme, kaç takip. Kaydedilecek ve kamp arkadaşına tek satır rapor gidecek (tanıklık).",
  },
};

// İç engel kategorisine göre öncelikli KİŞİSEL pratikler (çekirdeğe eklenir).
export const ENGEL_PRATIK: Record<string, PratikKodu[]> = {
  yetersizlik: ["P1", "P4"],
  degersizlik: ["P1", "P4"],
  belirsizlik: ["P2"],
  kontrol: ["P3"],
  baskasinin_onayi: ["P4"],
  red_korkusu: ["P7"],
};

export function pratikBul(kod: string): Pratik | null {
  return (PRATIKLER as Record<string, Pratik>)[kod] ?? null;
}
