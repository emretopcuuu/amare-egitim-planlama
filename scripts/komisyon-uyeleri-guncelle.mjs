// scripts/komisyon-uyeleri-guncelle.mjs
// ─────────────────────────────────────────────────────────────────────────
// 6 komisyonun üye listesini toplu güncelle. Konuşmacılar collection'ından
// fotoğraf + coreId eşlemesi otomatik.
//
//   node komisyon-uyeleri-guncelle.mjs            # dry-run
//   node komisyon-uyeleri-guncelle.mjs --apply    # uygula
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

const TR_LOWER = { 'Ç': 'c', 'Ğ': 'g', 'İ': 'i', 'I': 'i', 'Ö': 'o', 'Ş': 's', 'Ü': 'u' };
const makeCoreId = (ad) => {
  if (!ad) return '';
  let s = String(ad).normalize('NFC').trim();
  s = s.replace(/^(Prof\.?\s*Dr\.?\s*|Doç\.?\s*Dr\.?\s*|Uzm\.?\s*Dr\.?\s*|Op\.?\s*Dr\.?\s*|Dr\.?\s*|Dt\.?\s*|Dyt\.?\s*|Fzt\.?\s*|Av\.?\s*)/gi, '');
  s = s.replace(/[ÇĞİIÖŞÜçğıöşü]/g, c => TR_LOWER[c.toUpperCase()] || c.toLowerCase());
  s = s.toLowerCase();
  s = s.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return s;
};

// ─── Komisyon üye listeleri ───
const KOMISYON_UYELERI = {
  'butce': [
    { ad: 'Ferhat Gök',           unvan: 'Komisyon Başkanı' },
    { ad: 'Kenan Kozanhan',       unvan: 'Komisyon Üyesi' },
    { ad: 'Murat Zorluoğlu',      unvan: 'Komisyon Üyesi' },
    { ad: 'Birgül Özekici',       unvan: 'Komisyon Üyesi' },
  ],
  'hukuk': [
    { ad: 'Yavuz Bağcı',          unvan: 'Komisyon Başkanı' },
    { ad: 'Emre Topçu',           unvan: 'Komisyon Üyesi' },
    { ad: 'Furkan Çite',          unvan: 'Komisyon Üyesi' },
    { ad: 'Av.Oktay Doğan',       unvan: 'Komisyon Üyesi' },
    { ad: 'Av.Baki Özgen',        unvan: 'Komisyon Üyesi' },
    { ad: 'Av.Sevim Kul',         unvan: 'Komisyon Üyesi' },
    { ad: 'Ersel Arıcan',         unvan: 'Komisyon Üyesi' },
  ],
  'takdir': [
    { ad: 'Gülay Rençber',        unvan: 'Komisyon Başkanı' },
    { ad: 'Buse Alim',            unvan: 'Komisyon Üyesi' },
    { ad: 'Didem Aksoy Kaküllü',  unvan: 'Komisyon Üyesi' },
    { ad: 'Evrim Doğan',          unvan: 'Komisyon Üyesi' },
    { ad: 'Perihan Uslu',         unvan: 'Komisyon Üyesi' },
    { ad: 'Selçuk Meral',         unvan: 'Komisyon Üyesi' },
  ],
  'yardim-eli': [
    { ad: 'Şule Bağcı',           unvan: 'Komisyon Başkanı' },
    { ad: 'Gülay Rençber',        unvan: 'Komisyon Üyesi' },
    { ad: 'Filiz Bayazıt',        unvan: 'Komisyon Üyesi' },
    { ad: 'Buse Alim',            unvan: 'Komisyon Üyesi' },
    { ad: 'Evrim Doğan',          unvan: 'Komisyon Üyesi' },
    { ad: 'Tuba Arıcan',          unvan: 'Komisyon Üyesi' },
    { ad: 'Tülay Filtekin',       unvan: 'Komisyon Üyesi' },
  ],
  'teknoloji': [
    { ad: 'Aytuğ Gönül',          unvan: 'Komisyon Başkanı' },
    { ad: 'Emre Topçu',           unvan: 'Komisyon Üyesi' },
    { ad: 'Barış Diker',          unvan: 'Komisyon Üyesi' },
  ],
  'urun': [
    { ad: 'Prof.Dr. Mahmut İlker Yılmaz',    unvan: 'Komisyon Başkanı' },
    { ad: 'Arda Çakır',                       unvan: 'Komisyon Üyesi' },
    { ad: 'Kenan Kozanhan',                   unvan: 'Komisyon Üyesi' },
    { ad: 'Dyt.Beste Alimert Altunörs',       unvan: 'Komisyon Üyesi' },
    { ad: 'Fzt.F.Cumhur Elmacı',              unvan: 'Komisyon Üyesi' },
    { ad: 'Dr.Fatih Demir',                   unvan: 'Komisyon Üyesi' },
    { ad: 'Dr.Tunç Tuncer',                   unvan: 'Komisyon Üyesi' },
    { ad: 'Dr.Fatih Mehmet Adıyaman',         unvan: 'Komisyon Üyesi' },
    { ad: 'Uzm.Dr. Murat Karaman',            unvan: 'Komisyon Üyesi' },
    { ad: 'Uzm.Dr.Ufuk Memiş',                unvan: 'Komisyon Üyesi' },
    { ad: 'Doç.Dr.Nuri Haksever',             unvan: 'Komisyon Üyesi' },
    { ad: 'Prof.Dr.Halit Demir',              unvan: 'Komisyon Üyesi' },
  ],
};

// ─── Konuşmacı eşleştirme ───
let _list = null;
async function tumKonusmacilar() {
  if (_list) return _list;
  const snap = await db.collection('konusmacilar').get();
  _list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  return _list;
}

async function findKonusmaci(ad) {
  const list = await tumKonusmacilar();
  const adNorm = ad.normalize('NFC').toLocaleUpperCase('tr-TR');
  const adsiz = adNorm.replace(/^(PROF\.?\s*DR\.?\s*|DOÇ\.?\s*DR\.?\s*|UZM\.?\s*DR\.?\s*|OP\.?\s*DR\.?\s*|DR\.?\s*|DT\.?\s*|DYT\.?\s*|FZT\.?\s*|AV\.?\s*)/g, '').trim();
  const parcalar = adsiz.split(/\s+/).filter(p => p.length > 1);

  // 1. coreId direkt
  const cid = makeCoreId(ad);
  if (cid) {
    const direct = list.find(k => k.id === cid);
    if (direct) return direct;
    const coreMatch = list.find(k => makeCoreId(k.ad || '') === cid);
    if (coreMatch) return coreMatch;
  }

  // 2. Ad+soyad substring (her ikisi de eşleşmeli — false positive engelle)
  if (parcalar.length >= 2) {
    const ilk = parcalar[0];
    const son = parcalar[parcalar.length - 1];
    const m = list.find(k => {
      const kAd = (k.ad || '').normalize('NFC').toLocaleUpperCase('tr-TR');
      return kAd.includes(ilk) && kAd.includes(son);
    });
    if (m) return m;
  }
  // Soyad fallback YOK — yanlış eşleşmelere yol açıyor (örn iki kişi aynı soyada sahip olabilir)
  return null;
}

async function main() {
  console.log(`[komisyon-uyeleri] başlıyor | APPLY=${APPLY}\n`);
  const list = await tumKonusmacilar();
  console.log(`📚 ${list.length} konuşmacı yüklü\n`);

  const sonuclar = [];

  for (const [komisyonId, uyeler] of Object.entries(KOMISYON_UYELERI)) {
    console.log(`\n═══ ${komisyonId.toUpperCase()} (${uyeler.length} üye) ═══`);
    const yeniUyeler = [];
    for (const u of uyeler) {
      const kayit = await findKonusmaci(u.ad);
      const yeni = {
        ad: u.ad,
        unvan: u.unvan,
      };
      if (kayit?.id) yeni.coreId = kayit.id;
      else yeni.coreId = makeCoreId(u.ad) || null;
      if (kayit?.fotoURL) yeni.fotoURL = kayit.fotoURL;

      yeniUyeler.push(yeni);
      const status = kayit?.fotoURL ? '📸' : kayit ? '👤' : '❌';
      const izin = u.unvan === 'Komisyon Başkanı' ? '⭐' : ' ';
      console.log(`  ${izin} ${status}  ${u.ad.padEnd(35)} → coreId: ${yeni.coreId}`);
    }
    sonuclar.push({ komisyonId, yeniUyeler });
  }

  // Özet
  const toplam = sonuclar.reduce((acc, s) => acc + s.yeniUyeler.length, 0);
  const fotoVar = sonuclar.reduce((acc, s) => acc + s.yeniUyeler.filter(u => u.fotoURL).length, 0);
  const fotoYok = toplam - fotoVar;
  console.log(`\n═══════════════════════════════════════════════════════`);
  console.log(`📊 Özet: ${toplam} üye → ${fotoVar} fotoğraflı, ${fotoYok} foto yok`);

  if (!APPLY) {
    console.log('\n⚠️  DRY-RUN — yazma için: --apply');
    return;
  }

  console.log('\n💾 Firestore yazılıyor...');
  for (const s of sonuclar) {
    const ref = db.collection('komisyonlar').doc(s.komisyonId);
    await ref.set({
      uyeler: s.yeniUyeler,
      guncellemeTarihi: admin.firestore.FieldValue.serverTimestamp(),
      guncelleyenEmail: 's.emretopcu@gmail.com (cli toplu)',
    }, { merge: true });
    console.log(`   ✓ ${s.komisyonId} (${s.yeniUyeler.length} üye)`);
  }
  console.log('\n✅ Bitti.');
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
