// OneTeam Yürütme Kurulu
// Manuel kürasyon — Supabase'den çekilmiş ham liste başlangıç noktası,
// kullanıcı (Emre) bazı kişileri çıkarır/ekler.
//
// Foto: konuşmacılar collection'ından coreId match ile otomatik gelir
// (YurutmekuruluSayfasi.jsx → makeCoreId(ad) → konusmacilar[cid].fotoURL)
//
// Yapı: { presidential, '3star', '2star', '1star': [{ ad, unvan?, coreId? }] }

export const YURUTME_KURULU = {
  presidential: [
    { ad: 'Emre Topçu' },
    { ad: 'Ferhat Gök' },
    { ad: 'Kenan Kozanhan' },
    { ad: 'Murat Karaman' },
    { ad: 'Ziya Şakir Yılmaz' },
  ],
  '3star': [
    { ad: 'Aytuğ Gönül' },
    { ad: 'Fatih Mehmet Adıyaman' },
  ],
  '2star': [
    { ad: 'Ali Koçoğlu' },
    { ad: 'Furkan Çite' },
    { ad: 'İbrahim Düzenli' },
    { ad: 'Yunus Emre Yinanç' },
    // 'GENESİS E-TİCARET' — şirket hesabı, çıkarıldı
  ],
  '1star': [
    { ad: 'Alper Tunga Araman' },
    { ad: 'Arda Çakır' },
    { ad: 'Filiz Beyazıt' },
    { ad: 'Gülay Rençber' },
    { ad: 'İhsan Çomak' },
    { ad: 'Kasım Mazılıgüney' },
    { ad: 'Mahmut İlker Yılmaz' },
    { ad: 'Nuri Haksever' },
    { ad: 'Özgür Akkaş' },
    { ad: 'Özkan Davarcı' },
    { ad: 'Seçil Fida' },
    { ad: 'Sibel Özdemir' },
    { ad: 'Yakup Güngör' },
    { ad: 'Yalçın Kavlak' },
    { ad: 'Zeynep Demir' },
    // 'BAĞCI AKADEMİ' — şirket hesabı, çıkarıldı
    // 'ZEYNEP & EMRE ERKAN' — çift hesap, çıkarıldı (Emre Erkan olarak ekle?)
  ],
};
