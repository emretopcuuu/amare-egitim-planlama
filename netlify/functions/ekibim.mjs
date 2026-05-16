// netlify/functions/ekibim.mjs
// ─────────────────────────────────────────────────────────────────────────
// GET /.netlify/functions/ekibim
//   Authorization: Bearer <Firebase ID Token>
//
// Sponsor'un (login user) ekibindeki üyeleri 4 metrik ile döner:
//   1. Curriculum tamamlanma % (egitim_durumu)
//   2. Son aktivite (kaç gün önce)
//   3. Risk skoru (Aktif/Yavaşladı/Risk/Pasif)
//   4. Streak + toplam izleme saati
//
// Sponsor = current user'ın amareId'siyle
//   amare_raw_members.enroller_amare_id veya sponsor_amare_id eşleşenler
// ─────────────────────────────────────────────────────────────────────────

import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    }),
  });
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

async function supabaseGet(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

function daysSince(ts) {
  if (!ts) return null;
  let date;
  if (ts._seconds) date = new Date(ts._seconds * 1000);
  else if (ts.toMillis) date = new Date(ts.toMillis());
  else if (ts instanceof Date) date = ts;
  else if (typeof ts === 'string') date = new Date(ts);
  else return null;
  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
}

// Amare raw_data'dan PV/GV/order/qualifying rank gibi metrikleri çıkar
// raw_data field adları zamanla değişebileceği için esnek lookup
function amareMetrik(rawData) {
  if (!rawData || typeof rawData !== 'object') return {};
  const r = rawData;
  // PV (personal volume) — kişisel hacim
  const pv = Number(r.pv ?? r.personal_volume ?? r.PV ?? r.personalVolume ?? r.qualifying_pv ?? 0) || 0;
  // GV (group volume) — grup hacmi
  const gv = Number(r.gv ?? r.group_volume ?? r.GV ?? r.groupVolume ?? r.team_volume ?? 0) || 0;
  // Qualifying rank — paid-as rank
  const paidAs = r.paid_as_rank || r.paidAsRank || r.qualifying_rank || r.current_paid_rank || null;
  // Highest rank — en yüksek ulaşılan
  const enYuksek = r.highest_rank || r.highestRank || r.lifetime_rank || null;
  // Son sipariş
  const sonSiparis = r.last_order_date || r.lastOrderDate || r.last_purchase_date || null;
  // Direct count
  const direct = Number(r.direct_count ?? r.directCount ?? r.personally_enrolled_count ?? r.direct_enrolled ?? 0) || 0;
  // Active count (aktif sponsorluk altındaki)
  const aktifAlt = Number(r.active_downline ?? r.activeDownline ?? r.active_members ?? 0) || 0;
  // Toplam downline
  const toplamAlt = Number(r.total_downline ?? r.totalDownline ?? r.organization_size ?? 0) || 0;
  // Sıralama (Amare ranking — ülke / region için)
  const siralama = r.country_rank || r.regionRank || null;
  // Otoship aktif mi
  const otoshipAktif = r.autoship_active ?? r.autoshipActive ?? r.has_autoship ?? null;

  return {
    pv, gv, paidAs, enYuksek, sonSiparis, direct, aktifAlt, toplamAlt, siralama, otoshipAktif,
  };
}

// Bir sonraki rank'e uzaklık tahmini (PV/GV gerekli + bir sonraki rank gereksinimi)
// RANK_GEREKSINIM tablosu — Amare için kabaca gerçek değerler
const RANK_PV_GEREKSINIM = {
  brand_partner: 50, brand_builder: 100, bronze: 100, silver: 100,
  gold: 100, platinum: 100, leader: 100, senior_leader: 100,
  executive_leader: 100, diamond: 100, one_star_diamond: 100,
  two_star_diamond: 100, three_star_diamond: 100, presidential_diamond: 100,
};
const RANK_GV_GEREKSINIM = {
  brand_partner: 0, brand_builder: 500, bronze: 2000, silver: 5000,
  gold: 10000, platinum: 25000, leader: 50000, senior_leader: 100000,
  executive_leader: 250000, diamond: 500000, one_star_diamond: 1000000,
  two_star_diamond: 2500000, three_star_diamond: 5000000, presidential_diamond: 10000000,
};
const RANK_SIRA = ['brand_partner','brand_builder','bronze','silver','gold','platinum','leader','senior_leader','executive_leader','diamond','one_star_diamond','two_star_diamond','three_star_diamond','presidential_diamond'];

function rankKey(label) {
  if (!label) return null;
  const s = String(label).toLowerCase().replace(/[\s\-_]+/g, '_');
  if (s.includes('president')) return 'presidential_diamond';
  if (s.includes('3') || s.includes('three')) return 'three_star_diamond';
  if (s.includes('2') || s.includes('two')) return 'two_star_diamond';
  if (s.includes('1') || s.includes('one')) return 'one_star_diamond';
  if (s.includes('diamond')) return 'diamond';
  if (s.includes('exec')) return 'executive_leader';
  if (s.includes('senior')) return 'senior_leader';
  if (s.includes('leader')) return 'leader';
  if (s.includes('platinum')) return 'platinum';
  if (s.includes('gold')) return 'gold';
  if (s.includes('silver')) return 'silver';
  if (s.includes('bronze')) return 'bronze';
  if (s.includes('builder')) return 'brand_builder';
  if (s.includes('partner')) return 'brand_partner';
  return null;
}

function sonrakiRankUzaklik(rankLabel, pv, gv) {
  const k = rankKey(rankLabel);
  if (!k) return null;
  const idx = RANK_SIRA.indexOf(k);
  if (idx < 0 || idx === RANK_SIRA.length - 1) return null;
  const sonrakiKey = RANK_SIRA[idx + 1];
  const pvGerekli = RANK_PV_GEREKSINIM[sonrakiKey] || 0;
  const gvGerekli = RANK_GV_GEREKSINIM[sonrakiKey] || 0;
  return {
    sonrakiKey,
    pvEksik: Math.max(0, pvGerekli - pv),
    gvEksik: Math.max(0, gvGerekli - gv),
    pvYuzde: pvGerekli > 0 ? Math.min(100, Math.round((pv / pvGerekli) * 100)) : 100,
    gvYuzde: gvGerekli > 0 ? Math.min(100, Math.round((gv / gvGerekli) * 100)) : 100,
  };
}

// Risk skoru: 0=Pasif, 1=Risk, 2=Yavaşladı, 3=Aktif
function riskHesapla(sonAktiviteGun) {
  if (sonAktiviteGun === null) return { skor: 0, etiket: 'pasif', renk: 'slate' };
  if (sonAktiviteGun <= 3) return { skor: 3, etiket: 'aktif', renk: 'emerald' };
  if (sonAktiviteGun <= 7) return { skor: 3, etiket: 'aktif', renk: 'emerald' };
  if (sonAktiviteGun <= 14) return { skor: 2, etiket: 'yavasladi', renk: 'amber' };
  return { skor: 1, etiket: 'risk', renk: 'rose' };
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

  try {
    // 1. Bearer token al
    const auth = req.headers.get('authorization') || '';
    const m = auth.match(/^Bearer\s+(.+)$/i);
    if (!m) return new Response(JSON.stringify({ error: 'Token gerekli' }), {
      status: 401, headers: { 'Content-Type': 'application/json', ...CORS }
    });

    let decoded;
    try { decoded = await admin.auth().verifyIdToken(m[1]); }
    catch { return new Response(JSON.stringify({ error: 'Geçersiz token' }), {
      status: 401, headers: { 'Content-Type': 'application/json', ...CORS }
    }); }

    const uid = decoded.uid;

    // 2. users/{uid}.amareId
    const userDoc = await admin.firestore().doc(`users/${uid}`).get();
    if (!userDoc.exists) return new Response(JSON.stringify({ error: 'Profil yok' }), {
      status: 404, headers: { 'Content-Type': 'application/json', ...CORS }
    });
    const amareId = userDoc.data().amareId;
    if (!amareId) return new Response(JSON.stringify({ error: 'Amare ID bağlı değil' }), {
      status: 404, headers: { 'Content-Type': 'application/json', ...CORS }
    });

    // 3. Sponsor altındaki üyeleri Amare DB'den çek
    // enroller_amare_id eq amareId VEYA sponsor_amare_id eq amareId
    // Supabase OR ile: or=(enroller_amare_id.eq.X,sponsor_amare_id.eq.X)
    const amareIdStr = String(amareId);
    const ekipRows = await supabaseGet(
      `amare_raw_members?select=amare_id,full_name,email,phone,country,enrollment_date,rank,enroller_amare_id,sponsor_amare_id,raw_data&` +
      `or=(enroller_amare_id.eq.${encodeURIComponent(amareIdStr)},sponsor_amare_id.eq.${encodeURIComponent(amareIdStr)})&` +
      `limit=500`
    );

    if (!ekipRows || ekipRows.length === 0) {
      return new Response(JSON.stringify({
        amareId: amareIdStr,
        toplam: 0,
        ekip: [],
      }), { headers: { 'Content-Type': 'application/json', ...CORS } });
    }

    // 4. Her ekip üyesi için Firestore'da users/{uid} bul (amareId eşleşmesiyle)
    // Toplu query: where('amareId', 'in', [...]) — max 30 per query
    const allAmareIds = ekipRows.map(r => String(r.amare_id));
    const userMap = {}; // amareId -> { uid, streak, fotoURL, lastSeen }

    // Firestore in query 30'ar batch
    for (let i = 0; i < allAmareIds.length; i += 30) {
      const batch = allAmareIds.slice(i, i + 30);
      try {
        const snap = await admin.firestore()
          .collection('users')
          .where('amareId', 'in', batch)
          .get();
        snap.forEach(doc => {
          const d = doc.data();
          userMap[String(d.amareId)] = {
            uid: doc.id,
            fotoURL: d.fotoURL || null,
            displayName: d.displayName || null,
            sonGiris: d.sonGiris || null,
            streak: d.streak || null,
            ilkGiris: d.ilkGiris || null,
          };
        });
      } catch (e) {
        console.warn('[ekibim] user batch err:', e.message);
      }
    }

    // 5. Her ekip üyesi için egitim_durumu çek (aktif rank %)
    const allUids = Object.values(userMap).map(u => u.uid);
    const egitimMap = {}; // uid -> { mevcutRank, tamamlanmaOrani }
    for (const targetUid of allUids) {
      try {
        const ed = await admin.firestore().doc(`users/${targetUid}/egitim_durumu/profil`).get();
        if (ed.exists) {
          const d = ed.data();
          const aktif = d.yollar?.[d.mevcutRank];
          egitimMap[targetUid] = {
            mevcutRank: d.mevcutRank,
            mevcutRankLabel: d.mevcutRankLabel,
            tamamlanmaOrani: aktif?.tamamlanmaOrani ?? 0,
          };
        }
      } catch {}
    }

    // 5b. Sponsor'un davet log'unu çek (users/{sponsorUid}/davetler)
    const davetMap = {}; // amareId -> { sonGonderim, sablon, acildi, ... }
    try {
      const davetSnap = await admin.firestore().collection(`users/${uid}/davetler`).get();
      davetSnap.forEach(doc => {
        const d = doc.data();
        davetMap[doc.id] = {
          sonGonderim: d.sonGonderim?._seconds ? new Date(d.sonGonderim._seconds * 1000).toISOString() : null,
          sablon: d.sablon || null,
          kanal: d.kanal || null,
          sayaclar: d.sayaclar || 1,
          acildi: !!d.acildi,
          ilkAcilis: d.ilkAcilis?._seconds ? new Date(d.ilkAcilis._seconds * 1000).toISOString() : null,
        };
      });
    } catch (e) {
      console.warn('[ekibim] davet read err:', e.message);
    }

    // 5c. Üye başına aksiyon ipucu (smart action card — Amare metrik ile)
    function aksiyonOnerZengin(uye, davet, amareM, sonrakiRank, sonSiparisGun) {
      // 1. Site yok + davet hiç gönderilmemiş → davet et
      if (!uye.siteSet) {
        if (!davet) return { tur: 'davet', baslik: '🚀 Siteye davet et', renk: 'amber', detay: 'Henüz site kullanıcısı değil, magic link gönder' };
        const gunFarki = Math.floor((Date.now() - new Date(davet.sonGonderim).getTime()) / 86400000);
        if (gunFarki > 14) return { tur: 'davet', baslik: '📩 Tekrar davet et', renk: 'amber', detay: `${gunFarki}g önce davet edildi, hatırlat` };
        return { tur: 'bekle', baslik: '⏳ Davet bekleniyor', renk: 'slate', detay: `${gunFarki}g önce davet gönderildi` };
      }

      // 2. Sipariş analizi (Amare verileri varsa öncelikli)
      if (sonSiparisGun !== null && sonSiparisGun > 60) {
        return { tur: 'kontrol', baslik: '🛒 Sipariş yok', renk: 'rose', detay: `${sonSiparisGun}g sipariş yok — kontrol et` };
      }

      // 3. Rank'a çok yakınsa (≤%20 eksik) → son itki
      if (sonrakiRank && sonrakiRank.gvYuzde >= 80 && sonrakiRank.gvYuzde < 100) {
        return { tur: 'tebrik', baslik: '🎯 Bir sonraki rank yakın', renk: 'emerald', detay: `${sonrakiRank.sonrakiKey.replace(/_/g, ' ')} için %${sonrakiRank.gvYuzde} ilerlemiş — son itki` };
      }

      // 4. Risk grubu
      if (uye.risk?.etiket === 'risk') return { tur: 'kontrol', baslik: '⚠️ Kontrol et', renk: 'rose', detay: '14g+ aktif değil, kontrol et' };
      if (uye.risk?.etiket === 'yavasladi') return { tur: 'kontrol', baslik: '🟡 Hatırlat', renk: 'amber', detay: 'Yavaşlamış, kısa bir mesaj at' };

      // 5. Curriculum durumu
      if (uye.curriculumPct !== null && uye.curriculumPct < 30) {
        return { tur: 'egitim', baslik: '📚 Eğitime davet et', renk: 'sky', detay: `Curriculum %${uye.curriculumPct} — bu hafta hedefe odaklan` };
      }
      if (uye.curriculumPct !== null && uye.curriculumPct >= 90) {
        return { tur: 'tebrik', baslik: '🎉 Tebrik et', renk: 'emerald', detay: `Curriculum %${uye.curriculumPct} — kutla ve bir sonraki rank'a yönlendir` };
      }

      // 6. Aktif default
      return { tur: 'iletisim', baslik: '👋 Selam at', renk: 'emerald', detay: 'Aktif kalmaya devam, kısa mesaj at' };
    }

    // 6. Sonuçları birleştir
    const ekip = ekipRows.map(r => {
      const aId = String(r.amare_id);
      const user = userMap[aId];
      const egitim = user ? egitimMap[user.uid] : null;
      const sonAktiviteGun = user?.sonGiris ? daysSince(user.sonGiris) : null;
      const risk = riskHesapla(sonAktiviteGun);
      const izlemeSaat = user?.streak ? Math.floor((user.streak.total || 0) * 0.5) : 0; // estimate

      // Davet bilgisi
      const davet = davetMap[aId] || null;
      let davetGunFarki = null;
      if (davet?.sonGonderim) {
        davetGunFarki = Math.floor((Date.now() - new Date(davet.sonGonderim).getTime()) / 86400000);
      }

      // Email var mı? (davet kanalı için kritik)
      const emailVar = !!(r.email && r.email.includes('@'));
      // WhatsApp var mı?
      const phoneVar = !!(r.phone && String(r.phone).replace(/\D/g, '').length >= 10);

      // Kayıt tarihi → kaç gün önce katıldı (onboarding window)
      let kayitGunFarki = null;
      const kayitT = r.enrollment_date || r.raw_data?.enrollment_date;
      if (kayitT) {
        const kayitDate = new Date(kayitT);
        if (!isNaN(kayitDate.getTime())) {
          kayitGunFarki = Math.floor((Date.now() - kayitDate.getTime()) / 86400000);
        }
      }

      // Amare metrikleri
      const amareM = amareMetrik(r.raw_data);
      const sonrakiRank = sonrakiRankUzaklik(r.rank || r.raw_data?.career_rank, amareM.pv, amareM.gv);
      // Son sipariş gün farkı
      let sonSiparisGun = null;
      if (amareM.sonSiparis) {
        const d = new Date(amareM.sonSiparis);
        if (!isNaN(d.getTime())) sonSiparisGun = Math.floor((Date.now() - d.getTime()) / 86400000);
      }

      const baseUye = {
        amareId: aId,
        adSoyad: r.full_name || r.raw_data?.full_name || '?',
        email: r.email || null,
        emailVar,
        phone: r.phone || null,
        phoneVar,
        rank: r.rank || r.raw_data?.career_rank || null,
        kayitTarihi: r.enrollment_date || r.raw_data?.enrollment_date || null,
        kayitGunFarki,
        country: r.country || null,
        // Site etkileşimi
        siteSet: !!user,
        sonAktiviteGun,
        streak: user?.streak || null,
        izlemeSaat,
        curriculumPct: egitim?.tamamlanmaOrani ?? null,
        mevcutEgitimRank: egitim?.mevcutRankLabel ?? null,
        fotoURL: user?.fotoURL || null,
        risk,
        // Davet bilgisi
        davet: davet ? {
          sonGonderim: davet.sonGonderim,
          sablon: davet.sablon,
          kanal: davet.kanal,
          sayaclar: davet.sayaclar,
          gunFarki: davetGunFarki,
          acildi: davet.acildi,
          ilkAcilis: davet.ilkAcilis,
        } : null,
        // Amare metrikleri
        amare: {
          pv: amareM.pv,
          gv: amareM.gv,
          paidAs: amareM.paidAs,
          enYuksek: amareM.enYuksek,
          sonSiparis: amareM.sonSiparis,
          sonSiparisGun,
          direct: amareM.direct,
          aktifAlt: amareM.aktifAlt,
          toplamAlt: amareM.toplamAlt,
          siralama: amareM.siralama,
          otoshipAktif: amareM.otoshipAktif,
          sonrakiRank,
        },
      };
      // Aksiyon önerisi (Amare metrik ile zenginleşmiş)
      baseUye.aksiyon = aksiyonOnerZengin(baseUye, davet, amareM, sonrakiRank, sonSiparisGun);
      return baseUye;
    });

    // Risk skoruna göre sırala (en riskli üstte, sonra yavaşladı, sonra aktif, pasif en son)
    // Aktiflar arasında curriculum % azalan
    ekip.sort((a, b) => {
      // Risk önceliği: risk(1) > yavasladi(2) > aktif(3) > pasif(0)
      const prio = { 1: 0, 2: 1, 3: 2, 0: 3 };
      const aP = prio[a.risk.skor] ?? 4;
      const bP = prio[b.risk.skor] ?? 4;
      if (aP !== bP) return aP - bP;
      return (a.curriculumPct ?? 0) - (b.curriculumPct ?? 0);
    });

    // 6b. Bu hafta sponsor istatistikleri
    const haftaBasi = new Date();
    haftaBasi.setHours(0, 0, 0, 0);
    haftaBasi.setDate(haftaBasi.getDate() - haftaBasi.getDay() + (haftaBasi.getDay() === 0 ? -6 : 1)); // Pazartesi
    const haftaBasiMs = haftaBasi.getTime();
    const sponsorIstatistik = {
      buHaftaDavet: ekip.filter(e => e.davet?.sonGonderim && new Date(e.davet.sonGonderim).getTime() >= haftaBasiMs).length,
      buHaftaAcilan: ekip.filter(e => e.davet?.ilkAcilis && new Date(e.davet.ilkAcilis).getTime() >= haftaBasiMs).length,
      buHaftaYeniUye: ekip.filter(e => e.kayitGunFarki !== null && e.kayitGunFarki <= 7).length,
      buHaftaYeniSiteUye: ekip.filter(e => e.siteSet && e.kayitGunFarki !== null && e.kayitGunFarki <= 7).length,
    };

    // 7. Lider karnesi — bu haftanın skoru + son 12 haftanın geçmişi
    const aktifSayisi = ekip.filter(e => e.risk.etiket === 'aktif').length;
    const siteKullananSayisi = ekip.filter(e => e.siteSet).length;
    const curriculumOrtalama = ekip.filter(e => e.curriculumPct !== null).reduce((acc, e, _, arr) => acc + (e.curriculumPct / arr.length), 0);
    const son30gDavet = ekip.filter(e => e.davet && e.davet.gunFarki !== null && e.davet.gunFarki <= 30).length;

    // Skor hesabı (max 100)
    const aktifPuan = ekip.length > 0 ? (aktifSayisi / ekip.length) * 40 : 0;
    const sitePuan = ekip.length > 0 ? (siteKullananSayisi / ekip.length) * 25 : 0;
    const curriculumPuan = (curriculumOrtalama / 100) * 20;
    const davetPuan = ekip.length > 0 ? Math.min(15, (son30gDavet / Math.max(1, ekip.length - siteKullananSayisi)) * 15) : 0;
    const karneSkor = Math.round(aktifPuan + sitePuan + curriculumPuan + davetPuan);

    // Hafta key — ISO week (yyyy-Www)
    function isoWeek(date) {
      const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
      const dayNum = d.getUTCDay() || 7;
      d.setUTCDate(d.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      const weekNum = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
      return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
    }
    const buHafta = isoWeek(new Date());

    // Bu haftanın snapshot'ını yaz (idempotent — sadece set merge)
    try {
      await admin.firestore().doc(`users/${uid}/karne_log/${buHafta}`).set({
        week: buHafta,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        toplam: ekip.length,
        aktif: aktifSayisi,
        siteKullanan: siteKullananSayisi,
        curriculumOrt: Math.round(curriculumOrtalama),
        son30gDavet,
        skor: karneSkor,
      }, { merge: true });
    } catch (e) {
      console.warn('[ekibim] karne snapshot err:', e.message);
    }

    // Son 12 haftanın karne snapshot'larını çek
    let karneGecmis = [];
    try {
      const karneSnap = await admin.firestore().collection(`users/${uid}/karne_log`)
        .orderBy('week', 'desc').limit(12).get();
      karneGecmis = karneSnap.docs.map(doc => {
        const d = doc.data();
        return {
          week: d.week || doc.id,
          skor: d.skor || 0,
          aktif: d.aktif || 0,
          toplam: d.toplam || 0,
          siteKullanan: d.siteKullanan || 0,
        };
      }).reverse(); // En eski sol, en yeni sağ
    } catch (e) {
      console.warn('[ekibim] karne geçmiş err:', e.message);
    }

    return new Response(JSON.stringify({
      amareId: amareIdStr,
      toplam: ekip.length,
      ozet: {
        aktif: aktifSayisi,
        yavasladi: ekip.filter(e => e.risk.etiket === 'yavasladi').length,
        risk: ekip.filter(e => e.risk.etiket === 'risk').length,
        pasif: ekip.filter(e => e.risk.etiket === 'pasif').length,
        siteyiKullanan: siteKullananSayisi,
        davetEdilen: ekip.filter(e => !!e.davet).length,
        davetAcilan: ekip.filter(e => e.davet?.acildi).length,
        davetKayit: ekip.filter(e => e.davet?.acildi && e.siteSet).length, // açıldı + sonra kayıt oldu
        davetEdilebilir: ekip.filter(e => !e.siteSet && e.emailVar).length,
        whatsappBekleyen: ekip.filter(e => !e.siteSet && e.phoneVar && !e.emailVar).length,
        eksikVeri: ekip.filter(e => !e.emailVar && !e.phoneVar).length,
      },
      karne: {
        skor: karneSkor,
        buHafta,
        aktifPuan: Math.round(aktifPuan),
        sitePuan: Math.round(sitePuan),
        curriculumPuan: Math.round(curriculumPuan),
        davetPuan: Math.round(davetPuan),
        curriculumOrt: Math.round(curriculumOrtalama),
        son30gDavet,
        gecmis: karneGecmis,
      },
      sponsorIstatistik,
      ekip,
    }), { headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'private, max-age=120',
      ...CORS,
    }});

  } catch (err) {
    console.error('[ekibim] hata:', err.message, err.stack);
    return new Response(JSON.stringify({ error: 'Sistem hatası', detail: err.message.slice(0, 200) }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...CORS } });
  }
};
