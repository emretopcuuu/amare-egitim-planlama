// One Team Liderlik Konseyi — 2026 seçimiyle belirlenen 15 asıl üye.
//
// 27 Ekim 2026: Seçim 3 turda sonuçlandı (ilk tur + iki ek tur; son koltukta eşitlik).
// KURAL (seçim anketi K-079): sonuçta YALNIZ seçilen 15 isim, ADA GÖRE sıralı açıklanır;
// oy sayıları ve sıralama GÖSTERİLMEZ. Bu dosyaya oy bilgisi, sıra ya da yedek EKLENMEZ.
// Görev süresi 1 yıl; 1 Kasım 2026'da göreve başlıyor.
//
// Foto: konuşmacılar koleksiyonundan coreId eşleşmesiyle gelir (Yönetim Kurulu sayfasıyla aynı).
// Fotoğraf kaydı başka adla duranlarda coreId elle bağlanır; görünen ad doğru kalır.

const UYELER = [
  { ad: 'Arda Çakır' },
  { ad: 'Atakan Yaman' },
  { ad: 'Ayşen Özgentaş' },
  { ad: 'Aytuğ Gönül' },
  { ad: 'Emre Topçu' },
  { ad: 'Fahri Cumhur Elmacı', coreId: 'cumhur_elmaci' },
  { ad: 'Ferhat Gök' },
  { ad: 'Furkan Çite' },
  { ad: 'Kenan Kozanhan' },
  { ad: 'Mahmut İlker Yılmaz', coreId: 'mahmut_ilker_yilmaz' },
  { ad: 'Mehmet Güler' },
  { ad: 'Tunç Tuncer', coreId: 'tunc_tuncer' },
  { ad: 'Ufuk Memiş', coreId: 'ufuk_memis' },
  { ad: 'Yavuz Bağcı' },
  { ad: 'Ziya Şakir Yılmaz' },
];

// Alfabetik (Türkçe) — sıralama oy sırası DEĞİL, ada göredir.
export const LIDERLIK_KONSEYI = [...UYELER].sort((a, b) => a.ad.localeCompare(b.ad, 'tr'));
