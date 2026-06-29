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

export type WaSablonAnahtar = "giris" | "giris_hatirlatma" | "odev" | "duyuru";
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
    etiket: "Giriş daveti (link + şifre)",
    aciklama: "Aynayla tanışma daveti — kişiye özel giriş bağlantısı ve kodu.",
    friendlyName: "pd101_giris_v6",
    dil: "tr",
    kategori: "MARKETING",
    ayarAnahtari: "wa_tpl_giris",
    // Not: "giriş bağlantın / hesabına giriş / şifre / doğrulama" gibi login
    // ifadeleri Meta'da AUTHENTICATION sınıflandırması tetikleyip redde yol açtı
    // (v3 UTILITY, v4 MARKETING ikisi de INCORRECT_CATEGORY). Bu yüzden v6'da da
    // login dili YOK — kod "kamp kodun" olarak geçer.
    // v6: kod artık GÖVDEDE görünür ({{2}}) + WhatsApp iç tarayıcısı uyarısı.
    // Buton WhatsApp WebView'ında patlasa bile kişi tarayıcısını açıp adres+kodla
    // devam edebilir (eskiden kod sadece butonun URL'sindeydi, görünmüyordu).
    govde:
      "Merhaba {{1}}, PD101 Liderlik Aynası kampına hoş geldin! 🪞\n\n" +
      "Kampın telefonunda yaşıyor. Başlamak için:\n\n" +
      "1) Telefonunda Chrome veya Safari'yi aç\n" +
      "2) Şu adrese git: ayna.oneteamglobal.ai\n" +
      "3) Sana özel kamp kodun: {{2}}\n\n" +
      "Aşağıdaki butona da dokunabilirsin. Sayfa WhatsApp içinde açılıp ilerlemezse, sağ üstteki menüden \"Tarayıcıda aç\"ı (Chrome/Safari) seç — kurulum ve kamera yalnız gerçek tarayıcıda çalışır.\n\n" +
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
