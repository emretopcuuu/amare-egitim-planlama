// Tüm kullanıcıya görünen Türkçe metinler tek modülde toplanır.
export const tr = {
  app: {
    name: "Liderlik Aynası",
    tagline: "Kendini başkalarının gözünden gör.",
  },
  giris: {
    baslik: "Liderlik Aynası",
    altBaslik: "Yaka kartındaki QR kodu okut veya 6 haneli giriş kodunu yaz.",
    kodEtiket: "Giriş Kodu",
    girisYap: "Giriş Yap",
    girisYapiliyor: "Giriş yapılıyor…",
    yoneticiGirisi: "Yönetici girişi",
    hataGecersizBicim: "Geçersiz kod biçimi. 6 haneli sayı girmelisin.",
    hataKodHatali: "Kod hatalı. Lütfen tekrar dene.",
    hataCokFazlaDeneme: "Çok fazla deneme yapıldı. Lütfen birkaç dakika bekle.",
    hataSunucu: "Bir şeyler ters gitti. Lütfen tekrar dene.",
  },
  adminGiris: {
    baslik: "Yönetici Girişi",
    sifreEtiket: "Yönetici Şifresi",
    girisYap: "Giriş Yap",
    hataSifre: "Şifre hatalı.",
    katilimciGirisi: "Katılımcı girişine dön",
  },
  anaSayfa: {
    hosGeldin: (ad: string) => `Hoş geldin, ${ad}`,
    aciklama:
      "3 gün boyunca hem kendini hem kampta tanıdığın kişileri puanlayacaksın. Gün 3'te aynan açılacak.",
    degerlendirmeyeBasla: "Değerlendirmeye Başla",
    yakindaFaz2: "Puanlama ekranları bir sonraki fazda açılacak.",
    cikisYap: "Çıkış Yap",
  },
  admin: {
    baslik: "Yönetim Paneli",
    yakinda: "Katılımcı yönetimi, eşleştirme ve dalga kontrolü 3. fazda eklenecek.",
  },
  ekran: {
    baslik: "Kampın Nabzı",
    yakinda: "Canlı ekran 5. fazda yayında olacak.",
  },
  ortak: {
    oturumGerekli: "Oturum gerekli.",
  },
} as const;
