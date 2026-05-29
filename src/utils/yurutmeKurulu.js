// OneTeam Yürütme Kurulu
// Tek liste, kariyerler/rütbeler görünmez — sadece üye adları.
// Foto: konuşmacılar collection'ından coreId match ile otomatik gelir
// (YurutmekuruluSayfasi.jsx → makeCoreId(ad) → konusmacilar[cid].fotoURL)
//
// Sıralama: Mevcut hiyerarşi (Presidential → 3-Star → 2-Star → 1-Star)
//           ama UI'da rütbe başlığı/etiketi gösterilmez.

export const YURUTME_KURULU = [
  // Presidential Diamond (5)
  { ad: 'Emre Topçu' },
  { ad: 'Ferhat Gök' },
  { ad: 'Kenan Kozanhan' },
  { ad: 'Murat Karaman' },
  { ad: 'Ziya Şakir Yılmaz' },

  // 3-Star Diamond (2)
  { ad: 'Aytuğ Gönül' },
  { ad: 'Fatih Mehmet Adıyaman' },

  // 2-Star Diamond (4)
  { ad: 'Ali Koçoğlu' },
  { ad: 'Furkan Çite' },
  { ad: 'İbrahim Düzenli' },
  { ad: 'Yunus Emre Yinanç' },

  // 1-Star Diamond + eklemeler (15)
  { ad: 'Alper Tunga Araman' },
  { ad: 'Arda Çakır' },
  { ad: 'Barış Diker' },           // EKLENDİ
  { ad: 'Filiz Beyazıt' },
  { ad: 'Gülay Rençber' },
  { ad: 'İlknur Akkaş' },           // EKLENDİ (Özgür Akkaş maili altında)
  { ad: 'Kasım Mazılıgüney' },
  { ad: 'Mahmut İlker Yılmaz' },
  { ad: 'Özgür Akkaş' },
  { ad: 'Özkan Davarcı' },
  { ad: 'Seçil Fida' },
  { ad: 'Sibel Özdemir' },
  { ad: 'Şule Bağcı' },             // EKLENDİ (BAĞCI AKADEMİ maili altında)
  { ad: 'Yavuz Bağcı' },            // EKLENDİ (BAĞCI AKADEMİ maili altında)
  { ad: 'Zeynep Demir' },

  // ÇIKARILDI:
  // - İhsan Çomak
  // - Nuri Haksever
  // - Yakup Güngör
  // - Yalçın Kavlak
  // - ZEYNEP & EMRE ERKAN (çift hesap)
];
