// Eğitmen fotoğraflarında yüzü dairenin ortasına getiren odak noktaları.
//
// Önce herkese SABİT `objectPosition: center 25%` uygulanıyordu (Mayıs 2026,
// "yüz genelde üst çeyrektedir" tahmini). Ölçüldü: 162 fotoğrafın 71'inde
// gerçek yüz merkezi bu tahminden 10 puandan fazla sapıyor, 15'inde 20 puandan
// fazla. Sonuç: kiminde çene kesiliyor, kiminde sadece alın ve saç görünüyordu.
// Sabit değer ayrıca YATAY kaymayı hiç ele almıyordu (bazı fotoğraflarda yüz
// %39'da, yani solda).
//
// src/data/yuzOdak.json her fotoğraf için ölçülmüş [x%, y%] tutuyor. Üretimi:
// OpenCV YuNet ile toplu tarama (scripts/yuz-odak-hesapla.py). Yeni eğitmen
// fotoğrafı eklenince script yeniden çalıştırılmalı; listede olmayan kayıt
// eski sabit davranışa düşer, yani hiçbir koşulda bozulmaz.

import ODAK from '../data/yuzOdak.json';

const VARSAYILAN = 'center 25%';

// Verilen anahtarlardan ilk eşleşeni kullanır (doküman id'si, coreId, ...).
export const yuzOdak = (...anahtarlar) => {
  for (const a of anahtarlar) {
    if (!a) continue;
    const k = ODAK[a];
    if (k) return `${k[0]}% ${k[1]}%`;
  }
  return VARSAYILAN;
};

export default yuzOdak;
