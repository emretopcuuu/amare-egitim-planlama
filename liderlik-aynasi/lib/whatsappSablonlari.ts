// PD101 WhatsApp şablonları — saf tanım (server-only DEĞİL: simülasyon test edebilsin,
// hem kayıt scripti hem gönderim API'si hem önizleme UI'ı aynı kaynaktan beslensin).
//
// WhatsApp (Meta) onay kuralları gövdelere işlenmiştir:
//  • Gövde bir değişkenle BAŞLAYAMAZ ve BİTEMEZ.
//  • İki değişken yan yana olamaz.
//  • Değişkenler 1'den başlayıp atlamadan sıralanır.
//  • Değişken içeren CTA/medya şablonlarında tüm değişkenlere örnek değer şart.
// Kaynak: twilio.com/docs/content/create-templates-with-the-content-template-builder

export const BAGLANTI_TABANI = "https://ayna.oneteamglobal.ai";

export type WaSablonAnahtar = "giris" | "giris_hatirlatma" | "odev" | "duyuru" | "degerlendirme";
export type WaKategori = "UTILITY" | "MARKETING";

export type WaButon = {
  baslik: string;
  // {{n}} içerebilir; gönderimde değişkenle dolar.
  url: string;
};

export type WaSablon = {
  anahtar: WaSablonAnahtar;
  ikon: string;
  etiket: string;
  aciklama: string;
  // Twilio'ya kaydedilirken kullanılan benzersiz ad (küçük harf + alt çizgi).
  friendlyName: string;
  dil: string;
  kategori: WaKategori;
  // settings tablosundaki ContentSid anahtarı (kayıt scripti yazar, gönderim okur).
  ayarAnahtari: string;
  // {{1}}, {{2}} ... yer tutuculu gövde.
  govde: string;
  // Varsa tek URL butonu (giriş/ödev). Duyuruda yok.
  buton?: WaButon;
  // Serbest metin değişkeni içerir mi (duyuru) — UI'da metin kutusu açılır.
  serbestMi: boolean;
  // Meta onayı için örnek değerler (zorunlu).
  ornek: Record<string, string>;
};

export const WA_SABLONLAR: WaSablon[] = [
  {
    anahtar: "giris",
    ikon: "🔑",
    etiket: "Giriş kodu (tek mesaj)",
    aciklama:
      "Kişiye YALNIZ kamp giriş kodu gider — linksiz, kopyalanabilir tek mesaj. (Davet metni gönderilmez.)",
    friendlyName: "pd101_giris_v5",
    dil: "tr",
    kategori: "MARKETING",
    ayarAnahtari: "wa_tpl_giris",
    // ÖNEMLİ — kodu davet GÖVDESİNE koymak Meta'da imkânsız: v3/v6/v7 hepsi
    // INCORRECT_CATEGORY ile reddedildi (görünür kod = OTP sayılıyor).
    // GÜNCEL KARAR (kullanıcı): davet mesajı ARTIK GÖNDERİLMİYOR — "giris"
    // seçilince yalnız onaylı AUTHENTICATION/OTP kod şablonu (pd101_kamp_kodu,
    // settings.wa_tpl_kod) gider: tek mesaj, linksiz, kopyalanabilir kod.
    // Bu şablon tanımı Twilio kaydı bozulmasın diye duruyor; gönderimde
    // kullanılmıyor (app/api/admin/whatsapp/route.ts).
    govde:
      "Merhaba {{1}}, PD101 Liderlik Aynası kampına hoş geldin! 🪞\n\n" +
      "Kampa hazırlanmak için aşağıdaki butona dokun, seni bekleyen ilk adımları keşfet.\n\n" +
      "— One Team AI",
    buton: { baslik: "Kampıma Başla", url: `${BAGLANTI_TABANI}/giris?kod={{2}}` },
    serbestMi: false,
    ornek: { "1": "Ayşe", "2": "427813" },
  },
  {
    anahtar: "giris_hatirlatma",
    ikon: "⏰",
    etiket: "Kamp öncesi hatırlatma (giriş yapmamış)",
    aciklama: "Henüz uygulamaya giriş yapmamış katılımcılara son hatırlatma.",
    friendlyName: "pd101_hatirlatma_v3",
    dil: "tr",
    kategori: "UTILITY",
    ayarAnahtari: "wa_tpl_giris_hatirlatma",
    govde:
      "Merhaba {{1}},\n\n" +
      "PD101 Liderlik Aynası uygulamasına henüz giriş yapmadın. Kampa başlamadan önce giriş yapman gerekiyor. Aşağıdaki butona dokunabilirsin.\n\n" +
      "— One Team AI",
    buton: { baslik: "Şimdi Giriş Yap", url: `${BAGLANTI_TABANI}/giris?kod={{2}}` },
    serbestMi: false,
    ornek: { "1": "Ayşe", "2": "427813" },
  },
  {
    anahtar: "odev",
    ikon: "📝",
    etiket: "Görev hatırlatma",
    aciklama: "Sistemde bekleyen görevi olanlara (ödev yapmayanlara) dürtme.",
    friendlyName: "pd101_odev_hatirlatma",
    dil: "tr",
    kategori: "MARKETING",
    ayarAnahtari: "wa_tpl_odev",
    govde:
      "Merhaba {{1}}, sistemde seni bekleyen bir görevin var.\n\n" +
      "Bu görevi atlarsak aynadaki yansıman eksik kalır, sen de tam resmi göremezsin. Birkaç dakikanı ayır, kendine bu zamanı ver ve görevini tamamla.\n\n" +
      "— AYNA",
    buton: { baslik: "Görevime Git", url: `${BAGLANTI_TABANI}/giris?kod={{2}}` },
    serbestMi: false,
    ornek: { "1": "Mehmet", "2": "427813" },
  },
  {
    anahtar: "degerlendirme",
    ikon: "🪞",
    etiket: "Kamp değerlendirmesi hatırlatma",
    aciklama: "Kamp değerlendirmesini (360°) henüz tamamlamamış katılımcılara Gün 3 sabahı dürtme.",
    friendlyName: "pd101_degerlendirme_hatirlatma",
    dil: "tr",
    kategori: "UTILITY",
    ayarAnahtari: "wa_tpl_degerlendirme",
    govde:
      "Merhaba {{1}}, kamp değerlendirmen henüz eksik. 🪞\n\n" +
      "3 gün birlikte olduğun arkadaşlarını senin gözünden yansıtman için son şans — onlar görülmeyi hak ediyor, sen de tam Ayna Raporunu ancak böyle alırsın. Birkaç dakika yeter.\n\n" +
      "— AYNA",
    buton: { baslik: "Değerlendirmeye Git", url: `${BAGLANTI_TABANI}/giris?kod={{2}}` },
    serbestMi: false,
    ornek: { "1": "Mehmet", "2": "427813" },
  },
  {
    anahtar: "duyuru",
    ikon: "📢",
    etiket: "Genel duyuru",
    aciklama: "Serbest metinli duyuru — herkese, gruba veya seçili kişilere.",
    friendlyName: "pd101_genel_duyuru",
    dil: "tr",
    kategori: "MARKETING",
    ayarAnahtari: "wa_tpl_duyuru",
    govde:
      "Merhaba {{1}}, PD101 ekibinden sana bir duyurumuz var:\n\n" +
      "{{2}}\n\n" +
      "Görüşmek üzere.\n— AYNA",
    serbestMi: true,
    ornek: { "1": "Ayşe", "2": "Yarın sabah 09.00'da büyük salonda buluşuyoruz." },
  },
];

export function sablonBul(anahtar: string): WaSablon | undefined {
  return WA_SABLONLAR.find((s) => s.anahtar === anahtar);
}

// Ad alanından sıcak hitap için yalnız ilk adı al ("Ayşe Yılmaz" → "Ayşe").
export function ilkAd(tamAd: string): string {
  const p = tamAd.trim().split(/\s+/);
  return p[0] || tamAd.trim();
}

// Bir kişi + (varsa) serbest mesaj için Twilio ContentVariables haritası.
// Twilio'ya JSON string olarak gider: '{"1":"Ayşe","2":"427813"}'.
export function degiskenleriUret(
  sablon: WaSablon,
  kisi: { ad: string; kod: string },
  serbestMesaj?: string
): Record<string, string> {
  const ad = ilkAd(kisi.ad);
  switch (sablon.anahtar) {
    case "giris":
    case "giris_hatirlatma":
    case "odev":
    case "degerlendirme":
      return { "1": ad, "2": kisi.kod };
    case "duyuru":
      return { "1": ad, "2": (serbestMesaj ?? "").trim() };
  }
}

// {{n}} yer tutucularını değerlerle doldurur — UI önizlemesi için (gönderimde
// bu işi Twilio yapar). Buton ayrı satırda etiketiyle gösterilir.
export function onizleme(
  sablon: WaSablon,
  degiskenler: Record<string, string>
): string {
  const govde = sablon.govde.replace(/\{\{(\d+)\}\}/g, (_, n) => degiskenler[n] ?? `{{${n}}}`);
  return sablon.buton ? `${govde}\n\n[ ${sablon.buton.baslik} ]` : govde;
}

// Twilio Content API "types" gövdesi. Butonlu şablonlar twilio/call-to-action
// olur (+ butonsuz kanallar için twilio/text yedeği); duyuru salt metindir.
export function twilioTipleri(sablon: WaSablon): Record<string, unknown> {
  if (sablon.buton) {
    const yedekMetin = sablon.govde.replace(
      "— ",
      `Bağlantı: ${sablon.buton.url}\n\n— `
    );
    return {
      "twilio/call-to-action": {
        body: sablon.govde,
        actions: [{ type: "URL", title: sablon.buton.baslik, url: sablon.buton.url }],
      },
      "twilio/text": { body: yedekMetin },
    };
  }
  return { "twilio/text": { body: sablon.govde } };
}
