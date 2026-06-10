// src/utils/xp.js
// ─────────────────────────────────────────────────────────────────────────
// XP + Seviye sistemi — McGonigal "Reality Is Broken" FIX #2 (geri bildirim) + FIX #8 (ödül)
//
// FELSEFE: XP'yi ayrı bir yerde toplamıyoruz. Kullanıcının ZATEN var olan
// aktivitesinden (izleme, tamamlama, streak, üyelik, davet, rozet) deterministik
// türetiyoruz. Böylece:
//   - "Geçmişi say" otomatik: 13 yıllık üye anında yüksek seviyede başlar
//   - Tek kaynak gerçeği: veri değişince XP de değişir, senkron sorunu yok
//   - Ekstra Firestore yazımı yok (Faz 1)
//
// Seviye eşikleri kümülatif: Sv N'e ulaşmak için gereken toplam XP.
// ─────────────────────────────────────────────────────────────────────────

// ─── XP ağırlıkları ───────────────────────────────────────────────────────
export const XP_AGIRLIK = {
  tamamlananEgitim: 30,   // her tamamlanan kayıtlı eğitim
  izlemeSaati: 10,        // her tam saat izleme
  streakRekoru: 20,       // en uzun streak gününe çarpan
  davetAktif: 200,        // aktif kalan her davet (downline)
  uyelikYili: 100,        // her tam üyelik yılı
  rozet: 50,              // kazanılan her rozet
  takipEgitmen: 15,       // takip edilen her eğitmen
};

/**
 * Mevcut profil verilerinden toplam XP hesapla (deterministik, pure function).
 * @param {object} v
 * @param {number} v.tamamlanan   - tamamlanan eğitim sayısı
 * @param {number} v.izlemeSaniye - toplam izleme saniyesi
 * @param {number} v.streakRekoru - en uzun streak (gün)
 * @param {number} v.davetAktif   - aktif davet sayısı (varsa)
 * @param {number} v.uyelikYili   - tam üyelik yılı
 * @param {number} v.rozetSayisi  - kazanılan rozet sayısı
 * @param {number} v.takipSayisi  - takip edilen eğitmen sayısı
 * @returns {number} toplam XP (tam sayı)
 */
export function hesaplaXP(v = {}) {
  const izlemeSaati = Math.floor((v.izlemeSaniye || 0) / 3600);
  const xp =
    (v.tamamlanan || 0) * XP_AGIRLIK.tamamlananEgitim +
    izlemeSaati * XP_AGIRLIK.izlemeSaati +
    (v.streakRekoru || 0) * XP_AGIRLIK.streakRekoru +
    (v.davetAktif || 0) * XP_AGIRLIK.davetAktif +
    (v.uyelikYili || 0) * XP_AGIRLIK.uyelikYili +
    (v.rozetSayisi || 0) * XP_AGIRLIK.rozet +
    (v.takipSayisi || 0) * XP_AGIRLIK.takipEgitmen;
  return Math.max(0, Math.round(xp));
}

// ─── Seviye sistemi ─────────────────────────────────────────────────────────
// 3 kuşak: BP (1-10), Leader (11-20), Diamond (21-30)
// Her kuşakta seviye başına gereken XP artar — ilerledikçe daha zor (flow)
const KUSAK = [
  { ad: 'BP',      minSv: 1,  maxSv: 10, svBasinaXP: 500 },
  { ad: 'Leader',  minSv: 11, maxSv: 20, svBasinaXP: 750 },
  { ad: 'Diamond', minSv: 21, maxSv: 30, svBasinaXP: 1000 },
];

// Sv N'e ulaşmak için gereken KÜMÜLATİF XP (Sv 1 = 0 XP)
function seviyeEsigi(sv) {
  if (sv <= 1) return 0;
  let toplam = 0;
  for (let s = 2; s <= sv; s++) {
    // s seviyesine geçmek için, (s-1) seviyesinin kuşak çarpanı kullanılır
    const k = KUSAK.find(k => (s - 1) >= k.minSv && (s - 1) <= k.maxSv) || KUSAK[KUSAK.length - 1];
    toplam += k.svBasinaXP;
  }
  return toplam;
}

const MAX_SV = 30;

/**
 * XP'den seviye + ilerleme bilgisi hesapla.
 * @param {number} xp
 * @returns {{
 *   seviye: number, kusak: string,
 *   mevcutEsik: number, sonrakiEsik: number|null,
 *   ilerleme: number,       // 0-1 arası bu seviyedeki ilerleme
 *   kalanXP: number,        // sonraki seviyeye kalan
 *   buSeviyedeXP: number,   // bu seviyede biriken
 *   buSeviyeToplamXP: number, // bu seviyenin toplam genişliği
 *   maxMi: boolean
 * }}
 */
export function seviyeHesapla(xp) {
  const x = Math.max(0, xp || 0);
  let seviye = 1;
  for (let sv = 1; sv <= MAX_SV; sv++) {
    if (x >= seviyeEsigi(sv)) seviye = sv;
    else break;
  }
  const kusak = (KUSAK.find(k => seviye >= k.minSv && seviye <= k.maxSv) || KUSAK[KUSAK.length - 1]).ad;
  const mevcutEsik = seviyeEsigi(seviye);
  const maxMi = seviye >= MAX_SV;
  const sonrakiEsik = maxMi ? null : seviyeEsigi(seviye + 1);
  const buSeviyeToplamXP = maxMi ? 0 : (sonrakiEsik - mevcutEsik);
  const buSeviyedeXP = x - mevcutEsik;
  const ilerleme = maxMi ? 1 : Math.min(1, buSeviyedeXP / buSeviyeToplamXP);
  const kalanXP = maxMi ? 0 : Math.max(0, sonrakiEsik - x);
  return {
    seviye, kusak, mevcutEsik, sonrakiEsik,
    ilerleme, kalanXP, buSeviyedeXP, buSeviyeToplamXP, maxMi,
  };
}

// ─── Haftalık görev kuralları ──────────────────────────────────────────────
// Otomatik üretilir — mevcut haftalık veriden hesaplanır, admin yönetimi gerekmez.
// Her görev: { key, baslik, hedef, mevcut (fn), xp, ikon }

/**
 * Haftalık görevleri hesapla.
 * @param {object} h - haftalık veriler
 * @param {number} h.haftalikSaat   - bu hafta izleme saati
 * @param {number} h.haftalikEgitmenSayisi - bu hafta farklı eğitmen sayısı
 * @param {number} h.streakGun      - mevcut streak günü
 * @param {number} h.profilTamamlama - 0-100 profil tamamlama yüzdesi
 * @returns {Array<{key,baslik,ikon,mevcut,hedef,xp,tamam,pct}>}
 */
export function haftalikGorevler(h = {}) {
  const ham = [
    {
      key: 'cesitlilik',
      baslik: '3 farklı eğitmenden eğitim al',
      ikon: 'users',
      mevcut: h.haftalikEgitmenSayisi || 0,
      hedef: 3,
      xp: 150,
    },
    {
      key: 'streak5',
      baslik: '5 gün üst üste giriş yap',
      ikon: 'flame',
      mevcut: Math.min(h.streakGun || 0, 5),
      hedef: 5,
      xp: 200,
    },
    {
      key: 'haftalik3saat',
      baslik: 'Bu hafta 3 saat eğitim izle',
      ikon: 'clock',
      mevcut: Math.min(Math.round((h.haftalikSaat || 0) * 10) / 10, 3),
      hedef: 3,
      xp: 120,
    },
    {
      key: 'profil',
      baslik: 'Profilini %100 tamamla',
      ikon: 'user-check',
      mevcut: h.profilTamamlama || 0,
      hedef: 100,
      xp: 100,
    },
  ];
  return ham.map(g => {
    const pct = Math.min(1, g.hedef > 0 ? g.mevcut / g.hedef : 0);
    return { ...g, tamam: pct >= 1, pct };
  });
}

/**
 * Seviye için renk (mor → mavi → altın kuşak temasıyla uyumlu).
 */
export function seviyeRenk(kusak) {
  switch (kusak) {
    case 'Diamond': return { ring: '#22d3ee', rozet: '#0e7490', rozetBg: '#cffafe' }; // turkuaz
    case 'Leader':  return { ring: '#a78bfa', rozet: '#5b21b6', rozetBg: '#ede9fe' }; // mor
    default:        return { ring: '#fbbf24', rozet: '#854f0b', rozetBg: '#fef3c7' }; // altın
  }
}
