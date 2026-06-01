// scripts/haziran-takvim-ekle.mjs
// ─────────────────────────────────────────────────────────────────────────
// Excel'den Haziran 2026 takvimini güvenli şekilde ekler.
//
// Mantık:
// 1. takvim koleksiyonun JSON yedeği alınır
// 2. Excel parse edilir → satırlar normalize edilir
// 3. Her satır için: mevcut takvimde aynı (tarih + saat + ilk konuşmacı coreId) var mı kontrol edilir
//    - VAR  → ATLA (mevcut korunur)
//    - YOK  → EKLE
// 4. Konuşmacı kontrolü: makeCoreId ile konusmacilar collection'da var mı?
//    - VAR  → bağla
//    - YOK + benzer var → RAPORDA göster
//    - YOK + benzer yok → yeni dummy konusmaci doc oluştur
//
// Çalıştırma:
//   node haziran-takvim-ekle.mjs              # YEDEK + DRY-RUN (default)
//   node haziran-takvim-ekle.mjs --apply      # UYGULA (yedek + dry-run + apply)
// ─────────────────────────────────────────────────────────────────────────

import 'dotenv/config';
import admin from 'firebase-admin';
import xlsx from 'xlsx';
import fs from 'fs';
import path from 'path';

const EXCEL_PATH = 'C:/Users/Emre TOPÇU/Downloads/2026 HAZİRAN TAKVİMİ.xlsx';
const APPLY = process.argv.includes('--apply');

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  }),
});
const db = admin.firestore();

// ═══ Yardımcı fonksiyonlar ═══════════════════════════════════════════════

const makeSafeId = (ad) => {
  if (!ad) return '';
  return ad.normalize('NFC')
    .replace(/[​-‍﻿]/g, '')
    .replace(/ /g, ' ')
    .trim()
    .replace(/İ/g,'I').replace(/ı/g,'i').replace(/Ş/g,'S').replace(/ş/g,'s')
    .replace(/Ğ/g,'G').replace(/ğ/g,'g').replace(/Ö/g,'O').replace(/ö/g,'o')
    .replace(/Ü/g,'U').replace(/ü/g,'u').replace(/Ç/g,'C').replace(/ç/g,'c')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
};

const makeCoreId = (ad) => {
  if (!ad) return '';
  let clean = ad.normalize('NFC').replace(/[​-‍﻿]/g, '').replace(/ /g, ' ').trim();
  if (!clean) return '';
  let s = clean
    .replace(/^(Yrd\.?\s*Doç\.?\s*Dr\.?\s*|Prof\.?\s*Dr\.?\s*|Doç\.?\s*Dr\.?\s*|Uzm\.?\s*Dr\.?\s*|Op\.?\s*Dr\.?\s*|Dr\.?\s*Öğr\.?\s*Üyesi\.?\s*|Dr\.?\s*|Dt\.?\s*|Dyt\.?\s*|Psik\.?\s*|Psk\.?\s*|Ecz\.?\s*|Avt?\.?\s*|Öğr\.?\s*Gör\.?\s*|Arş\.?\s*Gör\.?\s*)/gi, '')
    .trim();
  s = s.replace(/\s+(İLE|ILE|VE|SÖYLEŞİ|SÖYLEŞI|SOYLESI|ile|ve|söyleşi)\.{0,3}\s*$/gi, '').trim();
  return s ? makeSafeId(s) : makeSafeId(clean);
};

const splitEgitmen = (e) => {
  if (!e) return [];
  return String(e).normalize('NFC').replace(/[​-‍﻿]/g, '').replace(/ /g, ' ')
    .split(/[\/,&]|\s*-\s*(?=[A-ZÇĞİÖŞÜa-zçğışöşü]*\.?\s*[A-ZÇĞİÖŞÜ]|Prof\.|Doç\.|Uzm\.|Dr\.|Dyt\.|Op\.)/)
    .map(n => n.trim()).filter(n => n.length > 1);
};

// Excel serial date → DD.MM.YYYY
const excelDate = (serial) => {
  if (typeof serial !== 'number') {
    // Belki string olarak gelmiş "01.06.2026"
    if (typeof serial === 'string' && /^\d{1,2}\.\d{1,2}\.\d{4}/.test(serial)) {
      return serial.match(/^(\d{1,2}\.\d{1,2}\.\d{4})/)[1];
    }
    return null;
  }
  // 25569 = days from 1900-01-01 to 1970-01-01 (Excel bug-corrected)
  const ms = (serial - 25569) * 86400 * 1000;
  const d = new Date(ms);
  if (isNaN(d.getTime())) return null;
  // UTC kullanılır — Excel serial timezone'suz, biz de DD.MM.YYYY formatına çeviriyoruz
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = d.getUTCFullYear();
  return `${dd}.${mm}.${yyyy}`;
};

// Excel time fraction → HH:MM
const excelTime = (frac) => {
  if (typeof frac !== 'number') {
    if (typeof frac === 'string' && /^\d{1,2}[:.]\d{2}/.test(frac)) {
      return frac.replace('.', ':').match(/^(\d{1,2}:\d{2})/)[1].padStart(5, '0');
    }
    return null;
  }
  const totalMins = Math.round(frac * 24 * 60);
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

// Gün ismini DD.MM.YYYY'den hesapla
const gunAdi = (tarih) => {
  const [d, m, y] = tarih.split('.').map(Number);
  const dt = new Date(y, m - 1, d);
  return ['PAZAR', 'PAZARTESİ', 'SALI', 'ÇARŞAMBA', 'PERŞEMBE', 'CUMA', 'CUMARTESİ'][dt.getDay()];
};

// Süre hesapla (saat + bitisSaati → dk)
const sureHesapla = (s, b) => {
  if (!s || !b) return null;
  const [sh, sm] = s.split(':').map(Number);
  const [bh, bm] = b.split(':').map(Number);
  return (bh * 60 + bm) - (sh * 60 + sm);
};

// Slot tanımla (sabah/akşam vb)
const slotTanimla = (saat) => {
  if (!saat) return '';
  const h = parseInt(saat.split(':')[0]);
  if (h < 10) return 'SABAH';
  if (h < 14) return 'OGLE';
  if (h < 19) return 'ÖGLEDEN_SONRA';
  return 'AKSAM';
};

// Levenshtein
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i]);
  for (let j = 1; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i-1] === b[j-1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i-1][j] + 1, dp[i][j-1] + 1, dp[i-1][j-1] + cost);
    }
  }
  return dp[m][n];
}

// ═══ 1. YEDEK ALMA ═══════════════════════════════════════════════════════

async function yedekAl() {
  console.log('\n═══ 1. YEDEK ═══');
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const dir = path.join(process.cwd(), 'yedekler');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const dosya = path.join(dir, `takvim-${ts}.json`);

  const snap = await db.collection('takvim').get();
  const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  fs.writeFileSync(dosya, JSON.stringify(data, null, 2), 'utf8');
  console.log(`✓ ${data.length} doc yedeklendi → ${path.relative(process.cwd(), dosya)}`);
  return dosya;
}

// ═══ 2. EXCEL PARSE ═══════════════════════════════════════════════════════

function excelParse() {
  console.log('\n═══ 2. EXCEL PARSE ═══');
  const wb = xlsx.readFile(EXCEL_PATH);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = xlsx.utils.sheet_to_json(ws, { header: 1, defval: '' });
  // Header satırı: [1] (TARİH, GÜN, ZOOM ID..., İÇERİK, BAŞ, BİT, KONUŞMACILAR)
  const satirlar = raw.slice(2); // veri 2'den başlar

  // Aynı gün için tarih boş bırakılmış → önceki tarihi taşı
  let sonTarih = null, sonGun = null;
  const etkinlikler = [];
  for (const s of satirlar) {
    const [tarihRaw, gunRaw, yer, icerik, basSaat, bitSaat, konusmacilar] = s;
    // Anlamlı içerik yoksa atla
    if (!icerik || String(icerik).trim().length < 2) continue;

    const tarih = tarihRaw ? excelDate(tarihRaw) : sonTarih;
    const gun = gunRaw ? String(gunRaw).trim() : sonGun;
    if (tarih) sonTarih = tarih;
    if (gun) sonGun = gun;
    if (!tarih) continue;

    const saat = excelTime(basSaat);
    const bitisSaati = excelTime(bitSaat);
    const baslik = String(icerik).trim();
    const yerStr = yer ? String(yer).trim() : '';
    const egitmen = konusmacilar ? String(konusmacilar).trim() : '';

    etkinlikler.push({
      tarih,
      gun: gun || gunAdi(tarih),
      saat,
      bitisSaati,
      egitim: baslik,
      egitmen,
      yer: yerStr,
      sure: sureHesapla(saat, bitisSaati),
      slot: slotTanimla(saat),
    });
  }
  console.log(`✓ ${etkinlikler.length} etkinlik parse edildi`);
  return etkinlikler;
}

// ═══ 3. KARŞILAŞTIRMA + RAPOR ═════════════════════════════════════════════

async function karsilastir(yeniler) {
  console.log('\n═══ 3. MEVCUTLA KARŞILAŞTIRMA ═══');

  // Tüm mevcut takvim doc'ları
  const snap = await db.collection('takvim').get();
  const mevcut = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  // Mükerrer kontrolü için index: tarih+saat+ilkKonusmaciCid
  const mevcutKeySet = new Set();
  mevcut.forEach(e => {
    const t = e.tarih;
    const s = e.saat;
    const ilk = splitEgitmen(e.egitmen)[0];
    const cid = makeCoreId(ilk);
    if (t && s && cid) mevcutKeySet.add(`${t}|${s}|${cid}`);
  });

  // Konuşmacılar koleksiyonu
  const kSnap = await db.collection('konusmacilar').get();
  const konusmacilar = kSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const konusmaciCidSet = new Set(konusmacilar.map(k => k.id));
  // Ek olarak ad'tan türetilen coreId'ler de
  konusmacilar.forEach(k => { if (k.ad) konusmaciCidSet.add(makeCoreId(k.ad)); });

  const eklenecek = [];
  const atlanacak = [];
  const yeniKonusmaci = new Map(); // cid → { ad, benzer:[...] }

  for (const e of yeniler) {
    const isimler = splitEgitmen(e.egitmen);
    const ilk = isimler[0];
    const cid = makeCoreId(ilk);
    const key = `${e.tarih}|${e.saat}|${cid}`;

    // 1. Mükerrer?
    if (mevcutKeySet.has(key)) {
      atlanacak.push({ ...e, sebep: 'MÜKERRER', ilkKonusmaci: ilk });
      continue;
    }

    // 2. Konuşmacıları kontrol et
    for (const isim of isimler) {
      const c = makeCoreId(isim);
      if (!c) continue;
      if (konusmaciCidSet.has(c)) continue;
      // Yeni konuşmacı — benzer arama
      if (!yeniKonusmaci.has(c)) {
        const benzer = konusmacilar
          .filter(k => k.ad)
          .map(k => ({ ad: k.ad, score: levenshtein(makeSafeId(isim), makeSafeId(k.ad)) }))
          .sort((a, b) => a.score - b.score)
          .slice(0, 3)
          .filter(x => x.score <= 5); // çok yakın olanları göster
        yeniKonusmaci.set(c, { ad: isim, benzer });
      }
    }

    eklenecek.push({ ...e, isimler, _ilkCid: cid });
    mevcutKeySet.add(key); // sonraki Excel satırı duplicate olmasın
  }

  return { eklenecek, atlanacak, yeniKonusmaci, mevcutSayisi: mevcut.length };
}

// ═══ 4. RAPOR YAZDIR ══════════════════════════════════════════════════════

function rapor({ eklenecek, atlanacak, yeniKonusmaci, mevcutSayisi }) {
  console.log('\n═══ 4. RAPOR ═══');
  console.log(`Mevcut toplam takvim:        ${mevcutSayisi}`);
  console.log(`Excel'den parse edilen:      ${eklenecek.length + atlanacak.length}`);
  console.log(`  ✓ EKLENECEK (yeni):        ${eklenecek.length}`);
  console.log(`  ⏭️  ATLANACAK (mükerrer):  ${atlanacak.length}`);
  console.log(`Yeni konuşmacı sayısı:       ${yeniKonusmaci.size}`);

  if (atlanacak.length > 0) {
    console.log('\n── ATLANACAK (mükerrer, mevcut korunur) ──');
    atlanacak.slice(0, 20).forEach((e, i) => {
      console.log(`  ${i+1}. ${e.tarih} ${e.saat} — ${e.egitim.slice(0,50)} (${e.ilkKonusmaci})`);
    });
    if (atlanacak.length > 20) console.log(`  ... +${atlanacak.length - 20} daha`);
  }

  if (eklenecek.length > 0) {
    console.log('\n── EKLENECEK ──');
    eklenecek.slice(0, 30).forEach((e, i) => {
      console.log(`  ${i+1}. ${e.tarih} ${e.saat}-${e.bitisSaati || '?'} — ${e.egitim.slice(0,50)}`);
      console.log(`     Konuşmacı: ${e.egitmen.slice(0,80)}`);
      console.log(`     Yer: ${e.yer.slice(0, 60)}`);
    });
    if (eklenecek.length > 30) console.log(`  ... +${eklenecek.length - 30} daha`);
  }

  if (yeniKonusmaci.size > 0) {
    console.log('\n── YENİ KONUŞMACILAR (benzer isim varsa kontrol et) ──');
    [...yeniKonusmaci.entries()].forEach(([cid, info], i) => {
      console.log(`  ${i+1}. "${info.ad}" → coreId: ${cid}`);
      if (info.benzer.length > 0) {
        console.log(`     ⚠️  BENZER MEVCUT:`);
        info.benzer.forEach(b => console.log(`        - "${b.ad}" (mesafe: ${b.score})`));
      } else {
        console.log(`     ✓ Benzer yok, yeni eklenir`);
      }
    });
  }
}

// ═══ 5. UYGULA ════════════════════════════════════════════════════════════

async function uygula({ eklenecek, yeniKonusmaci }) {
  console.log('\n═══ 5. UYGULAMA ═══');

  // 5a. Yeni konuşmacıları ekle (benzer YOKsa)
  let yKEklenen = 0, yKAtlanan = 0;
  for (const [cid, info] of yeniKonusmaci) {
    if (info.benzer.length > 0) {
      yKAtlanan++;
      console.log(`  ⏭️ Yeni konuşmacı ATLANDI (benzer var): "${info.ad}" → ${info.benzer[0].ad}`);
      continue;
    }
    try {
      await db.doc(`konusmacilar/${cid}`).set({
        ad: info.ad,
        unvan: '',
        biyografi: '',
        fotoURL: null,
        kaynak: 'haziran-2026-takvim',
        eklemeTarihi: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
      yKEklenen++;
      console.log(`  ✓ Yeni konuşmacı eklendi: "${info.ad}" (${cid})`);
    } catch (e) {
      console.log(`  ✗ Hata: "${info.ad}" — ${e.message}`);
    }
  }

  // 5b. Etkinlikleri ekle
  let etkBasarili = 0, etkHata = 0;
  for (const e of eklenecek) {
    try {
      const docData = {
        tarih: e.tarih,
        gun: e.gun,
        saat: e.saat || '',
        bitisSaati: e.bitisSaati || '',
        egitim: e.egitim,
        egitmen: e.egitmen,
        yer: e.yer,
        sure: e.sure || null,
        slot: e.slot,
        kaynak: 'haziran-2026-excel',
        saatGirilmedi: !e.saat,
        sehir: '', // online — sonra elle güncellenebilir
        kategori: '',
        aciklama: '',
        eklemeTarihi: admin.firestore.FieldValue.serverTimestamp(),
      };
      await db.collection('takvim').add(docData);
      etkBasarili++;
    } catch (err) {
      etkHata++;
      console.log(`  ✗ ${e.tarih} ${e.saat} ${e.egitim.slice(0,30)}: ${err.message}`);
    }
  }

  console.log(`\n📊 Sonuç:`);
  console.log(`   Konuşmacı: ${yKEklenen} eklendi, ${yKAtlanan} atlandı (benzer var)`);
  console.log(`   Etkinlik: ${etkBasarili} eklendi, ${etkHata} hata`);
}

// ═══ MAIN ═════════════════════════════════════════════════════════════════

(async () => {
  console.log(`\n${APPLY ? '🚀 APPLY MODE' : '🔍 DRY-RUN MODE'} — ${new Date().toLocaleString('tr-TR')}\n`);
  await yedekAl();
  const yeniler = excelParse();
  const sonuc = await karsilastir(yeniler);
  rapor(sonuc);

  if (!APPLY) {
    console.log('\n⚠️  DRY-RUN: değişiklik yapılmadı.');
    console.log('Onaylıyorsan: node haziran-takvim-ekle.mjs --apply');
  } else {
    await uygula(sonuc);
    console.log('\n✅ APPLY tamamlandı. Sayfayı yenile, /takvim\'i kontrol et.');
  }
  process.exit(0);
})().catch(err => { console.error('FATAL:', err); process.exit(1); });
