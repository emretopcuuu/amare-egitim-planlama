// scripts/liderleri-cv-isle.mjs
// ─────────────────────────────────────────────────────────────────────────
// CV (1).pptx'ten çıkarılan lider bilgilerini (biyografi + kariyer yolculuğu)
// konuşmacılar collection'ındaki EŞLEŞEN liderlere işler.
//
// Kariyer eşlemesi: aylar küçükten büyüğe sıralı → BRONZE'dan yukarı (monoton).
// "X. AY" = katılımdan itibaren kümülatif ay (1-tabanlı). "X. GÜN" = ilk basamak (1. ay).
//
//   node liderleri-cv-isle.mjs              # dry-run: özet + DOLDUR csv üret
//   node liderleri-cv-isle.mjs --apply      # csv'deki katılımları okuyup yaz (kariyer+bio)
// ─────────────────────────────────────────────────────────────────────────
import 'dotenv/config';
import admin from 'firebase-admin';
import { readFileSync, writeFileSync, existsSync } from 'fs';

const APPLY = process.argv.includes('--apply');
const CSV_PATH = 'C:/Users/Emre TOPÇU/Downloads/Claude-Cowork/Claude Outputs/lider_katilim_doldur_v1.csv';

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  }),
});
const db = admin.firestore();

const RANKS = ['BRAND PARTNER', 'BRAND BUILDER', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'LEADER', 'SENIOR LEADER', 'EXECUTIVE LEADER', 'DIAMOND', '1 STAR DIAMOND', '2 STAR DIAMOND', '3 STAR DIAMOND', 'PRESIDENTIAL DIAMOND'];
const rankIdx = (r) => RANKS.indexOf(r);

const TR_LOWER = { 'Ç': 'c', 'Ğ': 'g', 'İ': 'i', 'I': 'i', 'Ö': 'o', 'Ş': 's', 'Ü': 'u' };
const makeCoreId = (ad) => {
  if (!ad) return '';
  let s = String(ad).normalize('NFC').trim();
  s = s.replace(/^(Prof\.?\s*Dr\.?\s*|Doç\.?\s*Dr\.?\s*|Uzm\.?\s*Dr\.?\s*|Op\.?\s*Dr\.?\s*|Dr\.?\s*|Dt\.?\s*|Dyt\.?\s*|Fzt\.?\s*|Vet\.?\s*Hek\.?\s*|Av\.?\s*)/gi, '');
  s = s.replace(/[ÇĞİIÖŞÜçğıöşü]/g, c => TR_LOWER[c.toUpperCase()] || c.toLowerCase());
  s = s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return s;
};

const AYLAR = { ocak: 1, şubat: 2, subat: 2, mart: 3, nisan: 4, mayıs: 5, mayis: 5, haziran: 6, temmuz: 7, ağustos: 8, agustos: 8, eylül: 9, eylul: 9, ekim: 10, kasım: 11, kasim: 11, aralık: 12, aralik: 12 };
const AY_RE = '(ocak|şubat|subat|mart|nisan|mayıs|mayis|haziran|temmuz|ağustos|agustos|eylül|eylul|ekim|kasım|kasim|aralık|aralik)';

function katilimCoz(bio) {
  const b = (bio || '').toLowerCase();
  const KW = '(amare|tanış|tanis|başlang|baslang|katıl|katil|bu yana|all-in)';
  let m;
  m = b.match(new RegExp(AY_RE + '\\s+(\\d{4})[^.]{0,45}?' + KW)) || b.match(new RegExp(KW + '[^.]{0,45}?' + AY_RE + '\\s+(\\d{4})'));
  if (m) { const aystr = m[1] in AYLAR ? m[1] : m[2]; const yil = parseInt(m[1] in AYLAR ? m[2] : m[3] || m[2]); return { ay: AYLAR[aystr], yil, kesin: true }; }
  m = b.match(new RegExp('(\\d{4})\\s*(?:yılı|yili)?\\s*' + AY_RE + '[^.]{0,40}?' + KW));
  if (m) return { ay: AYLAR[m[2]], yil: parseInt(m[1]), kesin: true };
  m = b.match(new RegExp('(\\d{4})\\s+' + KW)) || b.match(new RegExp(KW + '[^.]{0,40}?(\\d{4})'));
  if (m) { const y = (m[1].match(/\d{4}/) || m[2].match(/\d{4}/))[0]; const yil = parseInt(y); if (yil >= 2009 && yil <= 2025) return { ay: 1, yil, kesin: false }; }
  m = b.match(/\b(20(0[9]|1\d|2[0-4]))\b/);
  if (m) return { ay: 1, yil: parseInt(m[1]), kesin: false };
  return null;
}

const ayEkle = (yil, ay, ekle) => { const t = (yil * 12 + (ay - 1)) + ekle; return { yil: Math.floor(t / 12), ay: (t % 12) + 1 }; };
const mmYYYY = (yil, ay) => `${String(ay).padStart(2, '0')}.${yil}`;
const parseMMYYYY = (s) => { const m = String(s || '').trim().match(/^(\d{1,2})[.\/](\d{4})$/); return m ? { ay: +m[1], yil: +m[2] } : null; };

// ── 1) Slaytları lidere göre grupla ─────────────────────────────────────
const slides = JSON.parse(readFileSync(new URL('./_cv_slides.json', import.meta.url)));
const liderler = new Map();
for (const s of slides) {
  if (!s.name || !s.rank) continue;
  const cid = makeCoreId(s.name);
  if (!cid) continue;
  if (!liderler.has(cid)) liderler.set(cid, { ad: s.name, rank: s.rank, city: null, bio: '', months: [], days: 0 });
  const L = liderler.get(cid);
  if (rankIdx(s.rank) > rankIdx(L.rank)) L.rank = s.rank;
  if (s.city && !L.city) L.city = s.city;
  if ((s.bio || '').length > L.bio.length) L.bio = s.bio;
  if ((s.months || []).length + (s.days || 0) > L.months.length + L.days) { L.months = s.months; L.days = s.days || 0; }
}

// ── 2) DB konuşmacılar ──────────────────────────────────────────────────
const snap = await db.collection('konusmacilar').get();
const dbById = new Map();
snap.forEach(d => dbById.set(d.id, d.data()));

// ── 3) Sınıflandır ──────────────────────────────────────────────────────
const kayitlar = [];   // matched + countOK (yazılabilir, katılım gerek)
const sorunlu = [];    // matched ama ay sayısı tutmuyor
const eslesmeyen = [];
for (const [cid, L] of liderler) {
  if (!dbById.has(cid)) { eslesmeyen.push(L.ad); continue; }
  const ri = rankIdx(L.rank);
  const beklenen = ri - 1;                       // BRONZE(2)..mevcut
  const effAylar = [...Array(L.days).fill(1), ...L.months].sort((a, b) => a - b); // gün → 1. ay
  if (effAylar.length !== beklenen || beklenen <= 0) { sorunlu.push({ cid, ad: L.ad, rank: L.rank, ay: effAylar.length, beklenen }); continue; }
  const kat = katilimCoz(L.bio);
  kayitlar.push({ cid, ad: L.ad, rank: L.rank, aylar: effAylar, kat, bio: L.bio, city: L.city });
}

// ── 3b) amare enrollment_date (asıl kaynak) + katılım çözümü ────────────
let amareMap = {};
try { amareMap = JSON.parse(readFileSync(new URL('./_amare_katilim.json', import.meta.url))); } catch { console.warn('uyarı: _amare_katilim.json yok (önce _amare_fetch.mjs çalıştır)'); }
const NOW = { yil: 2026, ay: 6 };
const isoToYM = (s) => { const m = String(s || '').match(/^(\d{4})-(\d{2})/); return m ? { ay: +m[2], yil: +m[1] } : null; };
for (const r of kayitlar) {
  const a = amareMap[r.cid];
  let kat = null, kaynak = '';
  if (a && a.secilen && (a.tip === 'rutbe-eslesme' || a.tip === 'yuksek-rutbe')) { kat = isoToYM(a.secilen); kaynak = a.tip === 'rutbe-eslesme' ? 'amare✓' : 'amare~'; }
  else if (r.kat?.kesin) { kat = { ay: r.kat.ay, yil: r.kat.yil }; kaynak = 'bio-kesin'; }
  else if (r.kat) { kat = { ay: r.kat.ay, yil: r.kat.yil }; kaynak = 'bio-tahmin'; }
  r.katFinal = kat; r.kaynak = kaynak || 'EKSİK';
  // tutarlılık: katılım + (enUstAy-1) bugünü geçmemeli; yıl 2008+ olmalı
  const maxAy = r.aylar[r.aylar.length - 1];
  if (kat) {
    const top = ayEkle(kat.yil, kat.ay, maxAy - 1);
    r.enUst = mmYYYY(top.yil, top.ay);
    const topVal = top.yil * 12 + top.ay, nowVal = NOW.yil * 12 + NOW.ay;
    if (topVal > nowVal + 3) r.durum = 'İNCELE-gelecek';
    else if (kat.yil < 2008) r.durum = 'İNCELE-eskitarih';
    else r.durum = 'OK';
  } else { r.durum = 'EKSİK'; r.enUst = ''; }
}

console.log(`DB konuşmacı: ${dbById.size} | CV lider: ${liderler.size}`);
console.log(`Yazılabilir (eşleşen + ay sayısı OK): ${kayitlar.length}`);
const say = (f) => kayitlar.filter(f).length;
console.log(`  katılım kaynak → amare✓:${say(r=>r.kaynak==='amare✓')}  amare~:${say(r=>r.kaynak==='amare~')}  bio-kesin:${say(r=>r.kaynak==='bio-kesin')}  bio-tahmin:${say(r=>r.kaynak==='bio-tahmin')}  EKSİK:${say(r=>r.kaynak==='EKSİK')}`);
console.log(`  durum → OK:${say(r=>r.durum==='OK')}  İNCELE:${say(r=>r.durum?.startsWith('İNCELE'))}  EKSİK:${say(r=>r.durum==='EKSİK')}`);
console.log(`Eşleşen ama ay-sayısı tutmuyor (atlanır): ${sorunlu.length}`);
console.log(`DB'de yok (atlanır): ${eslesmeyen.length}`);

if (!APPLY) {
  const head = 'coreId;ad;rutbe;basamak;katilim_AA.YYYY;kaynak;enUstTarih;durum';
  const oncelik = { 'İNCELE-gelecek': 0, 'İNCELE-eskitarih': 1, 'EKSİK': 2, 'OK': 3 };
  const rows = kayitlar
    .sort((a, b) => (oncelik[a.durum] ?? 9) - (oncelik[b.durum] ?? 9))
    .map(r => `${r.cid};${r.ad};${r.rank};${r.aylar.length};${r.katFinal ? mmYYYY(r.katFinal.yil, r.katFinal.ay) : ''};${r.kaynak};${r.enUst};${r.durum}`);
  writeFileSync(CSV_PATH, '﻿' + [head, ...rows].join('\r\n'), 'utf-8');
  console.log(`\n✍  Çözüm dosyası: ${CSV_PATH}`);
  console.log('   "İNCELE/EKSİK" satırlarındaki katilim_AA.YYYY değerini kontrol/düzelt. "OK"lar amare verisinden çözüldü. Sonra --apply.');
  console.log('\nSorunlu (ay-sayısı, atlanır):');
  sorunlu.forEach(r => console.log(`  • ${r.ad} [${r.cid}] ${r.rank} ay=${r.ay} beklenen=${r.beklenen}`));
  process.exit(0);
}

// ── 4) APPLY: csv'den katılımları oku ───────────────────────────────────
if (!existsSync(CSV_PATH)) { console.error('CSV yok, önce dry-run çalıştır.'); process.exit(1); }
const csv = readFileSync(CSV_PATH, 'utf-8').replace(/^﻿/, '').trim().split(/\r?\n/).slice(1);
const csvKat = new Map();
for (const line of csv) {
  const c = line.split(';');
  const cid = c[0]?.trim(); const kat = parseMMYYYY(c[4]);
  if (cid && kat) csvKat.set(cid, kat);
}

const NOW2 = 2026 * 12 + 6;
let ok = 0, atla = 0;
for (const r of kayitlar) {
  const kat = csvKat.get(r.cid) || (r.katFinal ? r.katFinal : (r.kat ? { ay: r.kat.ay, yil: r.kat.yil } : null));
  if (!kat) { atla++; continue; }
  // güvenlik: katılım + (en üst ay-1) bugünü 3 aydan fazla geçiyorsa = hatalı tarih, atla
  const maxAy = r.aylar[r.aylar.length - 1];
  const top = ayEkle(kat.yil, kat.ay, maxAy - 1);
  if (top.yil * 12 + top.ay > NOW2 + 3 || kat.yil < 2008) { console.log(`  ⚠ atlandı (tutarsız tarih): ${r.ad} katılım ${mmYYYY(kat.yil, kat.ay)} → enüst ${mmYYYY(top.yil, top.ay)}`); atla++; continue; }
  const kariyerGecmis = r.aylar.map((ayNo, j) => {
    const d = ayEkle(kat.yil, kat.ay, ayNo - 1);
    return { kariyer: RANKS[2 + j], tarih: mmYYYY(d.yil, d.ay) };
  });
  const data = { kariyerGecmis, katilimTarihi: mmYYYY(kat.yil, kat.ay) };
  if (r.bio) data.biyografi = r.bio;
  await db.collection('konusmacilar').doc(r.cid).set(data, { merge: true });
  ok++;
}
console.log(`\n✓ ${ok} lider yazıldı (kariyer + biyografi). Katılımı hâlâ eksik (atlanan): ${atla}`);
process.exit(0);
