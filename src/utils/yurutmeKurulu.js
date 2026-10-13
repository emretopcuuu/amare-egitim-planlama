// One Team Yönetim Kurulu — üye listesi
// Tek liste, kariyerler/rütbeler GÖRÜNMEZ — sadece üye adları.
// Foto: konuşmacılar collection'ından coreId match ile otomatik gelir.
//
// 13 Eki 2026: Yürütme Kurulu 21 Eylül'de kapandı, yerini One Team Yönetim
// Kurulu aldı. Liste "2026 ONE TEAM YÖNETİM KURULU" WhatsApp grubunun
// üyelerinden oluşur (kurul TÜM Diamond'lar değildir) ve rehber adları
// Amare kayıtlarıyla eşleştirilip Emre'nin teyidiyle düzeltilmiştir.
//
// Ortak hesaptaki eşler/ortaklar AYRI kartlarda durur, her biri kendi
// fotoğrafıyla (Emre, 13 Eki). Fotoğrafı sistemde başka adla duranlara
// coreId elle bağlandı — görünen ad doğru kalır, fotoğraf yine bulunur.
// Birkaç kayıt sistemde farklı adla duruyor; sayfada kişinin kendi adı yazılır:
//   Cihan Öyke        → kayıt: Durmuş Öyke (kardeşi)
//   Çağrı Kıvrakdal   → kayıt: Genesis E-Ticaret (şirket hesabı)
//   Şule / Yavuz Bağcı → kayıt: Bağcı Akademi (şirket hesabı)
//
// LİSTEDE DEĞİL: Gamze Çakmak — WhatsApp grubunda var ama kurul üyesi değil,
// One Team yönetim asistanı (Emre, 13 Eki). Tekrar eklenmesin.
//
// Sıralama: rütbe (Presidential → Diamond), sonra Türkçe ada göre.
// Liste değişince bu dosyayı güncelle; admin sayfadan da düzenleyebilir
// (Firestore site_icerik/yurutmekurulu override'ı bu dosyayı ezer).

export const YURUTME_KURULU = [
  { ad: 'Emre Topçu' },
  { ad: 'Ferhat Gök' },
  { ad: 'Kenan Kozanhan' },
  { ad: 'Murat Karaman' },
  { ad: 'Ziya Şakir Yılmaz' },
  { ad: 'Aytuğ Gönül' },
  { ad: 'Fatih Mehmet Adıyaman' },
  { ad: 'Ali Koçoğlu' },
  { ad: 'Çağrı Kıvrakdal' },
  { ad: 'Furkan Çite' },
  { ad: 'İbrahim Düzenli' },
  { ad: 'Yunus Emre Yinanç' },
  { ad: 'Arda Çakır' },
  { ad: 'Dr. Fatih Demir', coreId: 'fatih_demir' },
  { ad: 'Dr. Zeynep Demir', coreId: 'zeynep_demir' },
  { ad: 'Gülay Rençber' },
  { ad: 'İhsan Çomak' },
  { ad: 'Kasım Mazılıgüney' },
  { ad: 'Mahmut İlker Yılmaz' },
  { ad: 'Nuri Haksever' },
  { ad: 'Özgür Akkaş' },
  { ad: 'Özkan Davarcı' },
  { ad: 'Seçil Fida' },
  { ad: 'Sibel Özdemir' },
  { ad: 'Şule Bağcı' },
  { ad: 'Yakup Güngör' },
  { ad: 'Yavuz Bağcı' },
  { ad: 'Emre Erkan', coreId: 'emre_erkan' },
  { ad: 'Zeynep Erkan', coreId: 'zeynep_erkan' },
  { ad: 'Abdurrahman Kaya' },
  { ad: 'Adnan Çolak' },
  { ad: 'Adnan Gül' },
  { ad: 'Ahmet Dursun' },
  { ad: 'Ahmet Kılıç' },
  { ad: 'Alp Özekici', coreId: 'alp_ozekici' },
  { ad: 'Birgül Özekici', coreId: 'birgul_ozekici' },
  { ad: 'Alper Kırbıyık' },
  { ad: 'Atakan Yaman' },
  { ad: 'Aysun Demir Tosun', coreId: 'aysun_demir' },
  { ad: 'Ayşen Özgentaş' },
  { ad: 'Baki Özgen' },
  { ad: 'Bilal Özcan' },
  { ad: 'Canan Polat' },
  { ad: 'Cihan Öyke' },
  { ad: 'Cumali Bağcı' },
  { ad: 'Çiğdem Meral' },
  { ad: 'Didem Aksoy Kaküllü', coreId: 'didem_aksoy_kakullu' },
  { ad: 'Sertan Kaküllü', coreId: 'sertan_kakullu' },
  { ad: 'Ersel Arıcan', coreId: 'ersel_arican' },
  { ad: 'Tuba Arıcan', coreId: 'tuba_arican' },
  { ad: 'Evrim Doğan' },
  { ad: 'Fahri Cumhur Elmacı', coreId: 'cumhur_elmaci' },
  { ad: 'Fecri Çiftlik' },
  { ad: 'Fürüzan Demirel' },
  { ad: 'Giray Ulusoy' },
  { ad: 'Hüseyin Balcı' },
  { ad: 'Hüseyin Beğenik' },
  { ad: 'Kadir Demirbüken' },
  { ad: 'Keramettin Yanık' },
  { ad: 'Mehmet Akif Bilge', coreId: 'akif_bilge' },
  { ad: 'Mehmet Akif Topçu' },
  { ad: 'Mehmet Güler' },
  { ad: 'Melek Körce' },
  { ad: 'Merve Çaloğlu' },
  { ad: 'Murat Zorluoğlu' },
  { ad: 'Mustafa Doğan' },
  { ad: 'Mustafa Korkmaz' },
  { ad: 'Namık Önür' },
  { ad: 'Nilay Birdal' },
  { ad: 'Nurullah Yılmaz' },
  { ad: 'Ömer Koçak' },
  { ad: 'Perihan Uslu' },
  { ad: 'Ruhan Kosko' },
  { ad: 'Şafak Ayrancı', coreId: 'safak_ayranci' },
  { ad: 'Nesrin Ayrancı', coreId: 'nesrin_ayranci' },
  { ad: 'Saide Zöngür' },
  { ad: 'Selçuk Çamurcu', coreId: 'selcuk_camurcu' },
  { ad: 'Müberra Çamurcu' },
  { ad: 'Selda Tuna İş' },
  { ad: 'Serdar Acar' },
  { ad: 'Serkan Gürzsoy' },
  { ad: 'Sevda Tohumoğlu' },
  { ad: 'Sevim Kul' },
  { ad: 'Sibel Gökmen' },
  { ad: 'Toygar Şenelmiş' },
  { ad: 'Tunç Tuncer' },
  { ad: 'Tülay Filtekin' },
  { ad: 'Ufuk Memiş' },
  { ad: 'Ulaş Recep İnağ' },
  { ad: 'Vildan Tunç' },
  { ad: 'Barış Diker' },
  { ad: 'Filiz Bayazıt' },
  { ad: 'Handan Çolak' },
  { ad: 'İlknur Yalçın Akkaş', coreId: 'ilknur_akkas' },
  { ad: 'Orhan Coşkun' },
  { ad: 'Selçuk Adnan Meral' },
];
