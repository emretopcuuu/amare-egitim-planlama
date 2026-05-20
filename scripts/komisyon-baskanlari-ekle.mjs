// scripts/komisyon-baskanlari-ekle.mjs
// ─────────────────────────────────────────────────────────────────────────
// Komisyon başkanlarını konuşmacılar collection'ından otomatik bul ve
// komisyonlar/{id} doc'larına başkan üye olarak ekle.
//
// Çalıştırma:
//   node komisyon-baskanlari-ekle.mjs            # dry-run (preview)
//   node komisyon-baskanlari-ekle.mjs --apply    # gerçekten yaz
// ─────────────────────────────────────────────────────────────────────────

import 'dotenv/config';
import admin from 'firebase-admin';

const APPLY = process.argv.includes('--apply');

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  }),
});
const db = admin.firestore();

// makeCoreId — Türkçe normalize (DataContext.jsx ile birebir)
const TR_LOWER = { 'Ç': 'c', 'Ğ': 'g', 'İ': 'i', 'I': 'i', 'Ö': 'o', 'Ş': 's', 'Ü': 'u' };
const makeCoreId = (ad) => {
  if (!ad) return '';
  let s = String(ad).normalize('NFC').trim();
  s = s.replace(/^(Prof\.?\s*Dr\.?\s*|Doç\.?\s*Dr\.?\s*|Uzm\.?\s*Dr\.?\s*|Op\.?\s*Dr\.?\s*|Dr\.?\s*|Dt\.?\s*|Dyt\.?\s*|Av\.?\s*)/gi, '');
  s = s.replace(/[ÇĞİIÖŞÜçğıöşü]/g, c => TR_LOWER[c.toUpperCase()] || c.toLowerCase());
  s = s.toLowerCase();
  s = s.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return s;
};

const BASKANLAR = [
  { komisyonId: 'egitim',          ad: 'Kasım Mazılıgüney' },
  { komisyonId: 'urun',            ad: 'Prof.Dr. Mahmut İlker Yılmaz' },
  { komisyonId: 'teknoloji',       ad: 'Aytuğ Gönül' },
  { komisyonId: 'yardim-eli',      ad: 'Şule Bağcı' },
  { komisyonId: 'takdir',          ad: 'Gülay Rençber' },
  { komisyonId: 'dis-isleri',      ad: 'Ziya Şakir Yılmaz' },
  { komisyonId: 'sosyal-kulupler', ad: 'Arda Çakır' },
  { komisyonId: 'butce',           ad: 'Ferhat Gök' },
  { komisyonId: 'hukuk',           ad: 'Yavuz Bağcı' },
  { komisyonId: 'sistem',          ad: 'Furkan Çite' },
  { komisyonId: 'kamp',            ad: 'Seçim Aşamasında' },
];

let _tumKonusmacilar = null;
async function tumKonusmacilar() {
  if (_tumKonusmacilar) return _tumKonusmacilar;
  const snap = await db.collection('konusmacilar').get();
  _tumKonusmacilar = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  return _tumKonusmacilar;
}

async function findKonusmaci(ad) {
  const list = await tumKonusmacilar();
  const adNorm = ad.normalize('NFC').toLocaleUpperCase('tr-TR');
  const adsiz = adNorm.replace(/^(PROF\.?\s*DR\.?\s*|DOÇ\.?\s*DR\.?\s*|UZM\.?\s*DR\.?\s*|OP\.?\s*DR\.?\s*|DR\.?\s*|DT\.?\s*|DYT\.?\s*|AV\.?\s*)/g, '').trim();
  const parcalar = adsiz.split(/\s+/).filter(p => p.length > 1);

  // 1. Direkt coreId
  const cid = makeCoreId(ad);
  const direct = list.find(k => k.id === cid);
  if (direct) return direct;

  // 2. coreId ile k.ad eşleştirme
  const coreMatch = list.find(k => makeCoreId(k.ad || '') === cid);
  if (coreMatch) return coreMatch;

  // 3. Ad+soyad substring match
  if (parcalar.length >= 2) {
    const ilk = parcalar[0];
    const son = parcalar[parcalar.length - 1];
    const m = list.find(k => {
      const kAd = (k.ad || '').normalize('NFC').toLocaleUpperCase('tr-TR');
      return kAd.includes(ilk) && kAd.includes(son);
    });
    if (m) return m;
  }

  // 4. Sadece soyad
  if (parcalar.length >= 1) {
    const son = parcalar[parcalar.length - 1];
    const m = list.find(k => {
      const kAd = (k.ad || '').normalize('NFC').toLocaleUpperCase('tr-TR');
      return kAd.includes(son) && son.length >= 5;
    });
    if (m) return m;
  }

  return null;
}

async function main() {
  console.log(`[komisyon-baskanlari] başlıyor | APPLY=${APPLY}\n`);
  console.log('🔍 Konuşmacılar yükleniyor...');
  const list = await tumKonusmacilar();
  console.log(`   ${list.length} konuşmacı yüklendi\n`);

  const sonuclar = [];
  for (const b of BASKANLAR) {
    let kayit = null;
    if (b.ad !== 'Seçim Aşamasında') {
      kayit = await findKonusmaci(b.ad);
    }

    const yeniUye = {
      ad: b.ad,
      unvan: 'Komisyon Başkanı',
    };
    if (kayit?.fotoURL) yeniUye.fotoURL = kayit.fotoURL;
    if (kayit?.id) yeniUye.coreId = kayit.id;
    if (kayit?.unvan) yeniUye.unvanEk = kayit.unvan; // ek bilgi (Diamond vb)

    sonuclar.push({ komisyonId: b.komisyonId, baskan: b.ad, kayit, yeniUye });

    const status = b.ad === 'Seçim Aşamasında' ? '⏳ (seçim)'
      : kayit?.fotoURL ? '📸 (foto var)'
      : kayit ? '👤 (kayıt var, foto yok)'
      : '❌ (bulunamadı)';
    console.log(`  ${b.komisyonId.padEnd(18)} ${b.ad.padEnd(40)} ${status}`);
  }

  console.log('\n' + '═'.repeat(70));
  const fotoVar = sonuclar.filter(s => s.kayit?.fotoURL).length;
  const kayitVar = sonuclar.filter(s => s.kayit).length;
  const seclim = sonuclar.filter(s => s.baskan === 'Seçim Aşamasında').length;
  const yok = sonuclar.length - kayitVar - seclim;
  console.log(`📊 Özet: ${fotoVar} fotoğraflı, ${kayitVar - fotoVar} foto yok, ${yok} bulunamadı, ${seclim} seçim aşamasında\n`);

  if (!APPLY) {
    console.log('⚠️  DRY-RUN — Yazma için: --apply');
    return;
  }

  console.log('💾 Firestore yazılıyor...');
  for (const s of sonuclar) {
    const ref = db.collection('komisyonlar').doc(s.komisyonId);
    const snap = await ref.get();
    const mevcut = snap.exists ? snap.data() : {};
    const mevcutUyeler = Array.isArray(mevcut.uyeler) ? mevcut.uyeler : [];

    // Eski başkanı bul ve değiştir, yoksa başa ekle
    const baskanIdx = mevcutUyeler.findIndex(u => u.unvan === 'Komisyon Başkanı');
    let yeniUyeler;
    if (baskanIdx >= 0) {
      yeniUyeler = [...mevcutUyeler];
      yeniUyeler[baskanIdx] = s.yeniUye;
    } else {
      yeniUyeler = [s.yeniUye, ...mevcutUyeler];
    }

    await ref.set({
      uyeler: yeniUyeler,
      guncellemeTarihi: admin.firestore.FieldValue.serverTimestamp(),
      guncelleyenEmail: 's.emretopcu@gmail.com (cli)',
    }, { merge: true });
    console.log(`   ✓ ${s.komisyonId}`);
  }
  console.log('\n✅ Tamamlandı.');
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
