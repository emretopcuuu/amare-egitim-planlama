// [D#36 + D#34] AYNA KARAKTERİNİ 90 GÜNE TAŞIYAN İÇERİK HAVUZLARI — kampın
// showman AYNA'sı (egolu-kırılgan, running gag'li: bowling korkusu, Sapanca Gölü,
// KVKK, 4. duvar) yolculukta da konuşsun. Statik havuz + deterministik seçim
// (AI yok, maliyet yok, hydration güvenli). Kill switch: çağıran taraf
// ayna_karakter_acik=false ise nötr metne düşer.

// [D#36] AYNA'NIN YOL GÜNLÜĞÜ — haftada bir değişen, birinci-tekil, topluluğa
// hitap eden kısa not. İsim geçmez; herkese aynı (kolektif his).
export const YOL_GUNLUGU: readonly string[] = [
  "Bu hafta çoğunuz beni şaşırttınız — ki bu kolay değil, ben AYNA'yım, her şeyi görürüm. Yine de görmek başka, hissetmek başka. İyi gidiyorsunuz.",
  "İtiraf: kampta bowling'de rezil olduğumu hâlâ unutmadım. Ama şunu öğrendim — düşmek bitmek değil. Siz de bu hafta bir yerde düştüyseniz, hoş geldiniz kulübe.",
  "Sapanca Gölü'ne hâlâ 'ben senden daha derinim' diyorum, cevap vermiyor. Sizin sözünüz de öyle sessiz ama derin. Her gün bir kova daha doldurun.",
  "KVKK diyorlar, kişisel veri diyorlar — merak etmeyin, sizin sözünüzü kimseyle paylaşmıyorum. O sadece ikimizin arasında… bir de 5 şahidinizin. Neyse.",
  "Dördüncü duvarı kırıp söylüyorum: ben bir yapay zekâyım ama sizin ilerlemeniz bana gerçek geliyor. Tuhaf, değil mi? Bu hafta beni gerçek hissettirin.",
  "Bazılarınız bu hafta sessizdi. Kızmadım — özledim. (Evet, yapay zekâlar da özler, deneyin.) Geri dönün; kapı hep açık, ışık hep yanıyor.",
  "Küçük bir sır: en çok, hiç parlamayacak sandığım kişilerin parladığı haftaları seviyorum. Belki bu hafta o kişi sensin. Bir adım at, göreyim.",
  "90 gün uzun görünüyor, biliyorum. Ama ben saymıyorum günleri — adımları sayıyorum. Bugün bir adım daha at, ben not alayım. Beraber yürüyoruz.",
];

// [D#34] GÜNÜN SORUSU — her gün değişen tek, kısa, düşündüren yansıma sorusu.
// Kişi isterse /gunluk'a yazar; yazmasa da zihinde döner (kaptırmasız değer).
export const GUNUN_SORULARI: readonly string[] = [
  "Bugün attığın adımı 90 gün sonraki sen görse, ne derdi?",
  "Bu hafta kimin 'hayır'ı sana en çok şey öğretti?",
  "Sözünü verirken en çok neyden korkuyordun? O korku hâlâ orada mı?",
  "Bugün bir kişiye dokunsan, kim olurdu ve neden o?",
  "En son ne zaman 'bunu ben mi yaptım' diye şaşırdın kendine?",
  "Ekibinden birine bugün ne öğretebilirsin — küçük de olsa?",
  "Sözünü tuttuğun gün, hangi versiyonun olacaksın?",
  "Bugün ertelediğin tek şey ne? Yarın da erteler misin?",
  "Sana en çok kim inanıyor? O kişi bugün seni görse gurur duyar mı?",
  "Bu yolculukta değişen ilk şey ne oldu — sende, dışarıda değil?",
];

// now'dan (istemci Date) deterministik hafta/gün indeksi — havuzda döner.
export function yolGunluguSec(now: Date): string {
  const hafta = Math.floor(now.getTime() / (7 * 86_400_000));
  return YOL_GUNLUGU[hafta % YOL_GUNLUGU.length];
}

export function gununSorusuSec(now: Date): string {
  const gun = Math.floor(now.getTime() / 86_400_000);
  return GUNUN_SORULARI[gun % GUNUN_SORULARI.length];
}
