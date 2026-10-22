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
 * @param {number} v.gorevXP      - tamamlanmış görevlerin kalıcı puanı (gorevXPHesapla; 23 Eki 2026)
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
    (v.takipSayisi || 0) * XP_AGIRLIK.takipEgitmen +
    (v.gorevXP || 0);
  return Math.max(0, Math.round(xp));
}

// ─── Seviye sistemi ─────────────────────────────────────────────────────────
// 3 kuşak: Başlangıç (1-10), Gelişim (11-20), Ustalık (21-30). Ekranda ad t('xp_kusak_<ad>') ile yazılır.
// 🔴 23 Eki 2026 (Emre): adlar eskiden "BP / Leader / Diamond"du — Amare basamağı sanıldı ("SV 7 · BP"; Ahmet Dursun
// "XP'ler neyi ifade ediyor?" diye sordu). XP uygulama içi gelişim puanıdır, Amare kariyerine adlar bile benzemesin.
// Her kuşakta seviye başına gereken XP artar — ilerledikçe daha zor (flow)
const KUSAK = [
  { ad: 'baslangic', minSv: 1,  maxSv: 10, svBasinaXP: 500 },
  { ad: 'gelisim',   minSv: 11, maxSv: 20, svBasinaXP: 750 },
  { ad: 'ustalik',   minSv: 21, maxSv: 30, svBasinaXP: 1000 },
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

// ─── Görev puanı (23 Eki 2026; Emre: "görev puanı haftada bir kez gerçekten eklensin") ───────────────
// Eskiden görev kartı "✓ +150 XP" diyordu ama puan toplama HİÇ girmiyordu (hesaplaXP görevleri içermiyordu).
// Artık tamamlanan görev kişinin kendi kaydına (users/{uid}/meta/gorev_xp) hafta anahtarıyla BİR KEZ yazılır;
// toplam o kayıttan büyür. "profil" tek seferliktir (her hafta +100 vermez). Hafta = Pazartesi 00:00 TR.
export const GOREV_XP = { cesitlilik: 150, streak5: 200, haftalik3saat: 120, profil: 100 };
export const GOREV_TEK_SEFER = ['profil'];
const TR_MS = 3 * 3600 * 1000;               // Türkiye UTC+3 (2016'dan beri yaz saati yok)

/** O anın TR takvim haftasının başı (Pazartesi 00:00 TR), ms. */
export function haftaBasiMs(an = Date.now()) {
  const d = new Date(an + TR_MS);
  const gun = (d.getUTCDay() + 6) % 7;        // Pazartesi = 0
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - gun) - TR_MS;
}

/** ISO hafta anahtarı (TR saatiyle), ör. "2026-W43". */
export function haftaAnahtari(an = Date.now()) {
  const d = new Date(an + TR_MS);
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  t.setUTCDate(t.getUTCDate() + 3 - ((t.getUTCDay() + 6) % 7));        // haftanın Perşembe'si
  const yil = t.getUTCFullYear();
  const ilk = new Date(Date.UTC(yil, 0, 4));
  const no = 1 + Math.round(((t - ilk) / 86400000 - 3 + ((ilk.getUTCDay() + 6) % 7)) / 7);
  return `${yil}-W${String(no).padStart(2, '0')}`;
}

/** Kayıttan görev XP'si: her hafta her görev bir kez, tek seferlik görev bir kez. Bilinmeyen anahtar sayılmaz. */
export function gorevXPHesapla(kayit) {
  if (!kayit) return 0;
  let xp = 0;
  for (const anahtarlar of Object.values(kayit.haftalar || {})) {
    for (const k of new Set(Array.isArray(anahtarlar) ? anahtarlar : [])) {
      if (!GOREV_TEK_SEFER.includes(k) && GOREV_XP[k]) xp += GOREV_XP[k];
    }
  }
  for (const k of GOREV_TEK_SEFER) if (kayit[k] === true) xp += GOREV_XP[k];
  return xp;
}

/** Bu hafta tamamlanıp henüz kayda geçmemiş görevler: { haftalik: [anahtar], tekSefer: [anahtar] }. */
export function yeniTamamlananlar(gorevler, kayit, hafta) {
  const bu = new Set((kayit && kayit.haftalar && kayit.haftalar[hafta]) || []);
  const haftalik = [], tekSefer = [];
  for (const g of gorevler || []) {
    if (!g.tamam) continue;
    if (GOREV_TEK_SEFER.includes(g.key)) { if (!(kayit && kayit[g.key] === true)) tekSefer.push(g.key); }
    else if (!bu.has(g.key)) haftalik.push(g.key);
  }
  return { haftalik, tekSefer };
}

/** Görev kartının "sayıldı" bilgisi: bu hafta kayda geçti mi (tek seferlikte hiç geçti mi). */
export function gorevSayildiMi(key, kayit, hafta) {
  if (!kayit) return false;
  if (GOREV_TEK_SEFER.includes(key)) return kayit[key] === true;
  return ((kayit.haftalar && kayit.haftalar[hafta]) || []).includes(key);
}

// ─── Haftalık görev kuralları ──────────────────────────────────────────────
// Otomatik üretilir — mevcut haftalık veriden hesaplanır, admin yönetimi gerekmez.
// Her görev: { key, baslik, hedef, mevcut (fn), xp, ikon }

/**
 * Haftalık görevleri hesapla.
 * @param {object} h - haftalık veriler
 * @param {number} h.haftalikSaat   - bu hafta (Pazartesi'den beri, TR) izleme saati
 * @param {number} h.haftalikEgitmenSayisi - bu hafta farklı eğitmen sayısı
 * @param {number} h.streakGun      - mevcut streak günü
 * @param {number} h.profilTamamlama - 0-100 profil tamamlama yüzdesi
 * @returns {Array<{key,baslik,ikon,mevcut,hedef,xp,tamam,pct}>}
 */
export function haftalikGorevler(h = {}) {
  const ham = [
    {
      key: 'cesitlilik',
      baslik: 'xp_gorev_cesitlilik',
      ikon: 'users',
      mevcut: h.haftalikEgitmenSayisi || 0,
      hedef: 3,
      xp: GOREV_XP.cesitlilik,
    },
    {
      key: 'streak5',
      baslik: 'xp_gorev_streak5',
      ikon: 'flame',
      mevcut: Math.min(h.streakGun || 0, 5),
      hedef: 5,
      xp: GOREV_XP.streak5,
    },
    {
      key: 'haftalik3saat',
      baslik: 'xp_gorev_haftalik3saat',
      ikon: 'clock',
      mevcut: Math.min(Math.round((h.haftalikSaat || 0) * 10) / 10, 3),
      hedef: 3,
      xp: GOREV_XP.haftalik3saat,
    },
    {
      key: 'profil',
      baslik: 'xp_gorev_profil',
      ikon: 'user-check',
      mevcut: h.profilTamamlama || 0,
      hedef: 100,
      xp: GOREV_XP.profil,
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
    case 'ustalik': return { ring: '#22d3ee', rozet: '#0e7490', rozetBg: '#cffafe' }; // turkuaz
    case 'gelisim': return { ring: '#a78bfa', rozet: '#5b21b6', rozetBg: '#ede9fe' }; // mor
    default:        return { ring: '#fbbf24', rozet: '#854f0b', rozetBg: '#fef3c7' }; // altın
  }
}
