// Veri proxy — kullanıcının ağı firestore.googleapis.com'a erişemezse
// (ISS DNS/IPv6 sorunları) veri KENDİ domain'imiz üzerinden gelir.
// Netlify sunucusu Firestore'a admin SDK ile erişir → istemci yalnız
// egitimtakvimi.oneteamglobal.ai'ye bağlanır (o her zaman erişilebilir).
//
// GÜVENLİK: yalnız zaten public-read olan koleksiyonlar (whitelist);
// alan filtresi ile base64 görseller/transcript gibi dev alanlar dışarıda.
import admin from 'firebase-admin';

function initFirebase() {
  if (admin.apps.length) return admin.firestore();
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    }),
  });
  return admin.firestore();
}

// Koleksiyon → izinli alanlar (null = tümü). Firestore rules'ta zaten read:true olanlar.
const WHITELIST = {
  takvim: ['egitim', 'gun', 'tarih', 'saat', 'bitisSaati', 'sure', 'egitmen', 'yer', 'hafta', 'kategori', 'sehir', 'aciklama', 'katilimSayisi', 'tamamlandi', 'etkinlikTuru', 'mekanAdi', 'acikAdres', 'sunucular', 'programAkisi', 'katilTiklamaSayisi', 'zoomGercekKatilim', 'zoomOrtDakika', 'zoomEgri', 'canliKisi'],
  konusmacilar: ['ad', 'unvan', 'biyografi', 'bio', 'kisaTanitim', 'linkedin', 'instagram', 'website', 'meslek', 'amareKariyer', 'doktorBrans', 'kariyerGecmis', 'katilimTarihi', 'sehir', 'favori_alintilar'],
  settings: null,
  sablonlar: null,
};

const filtrele = (data, alanlar) => {
  if (!alanlar) return data;
  const out = {};
  for (const a of alanlar) if (data[a] !== undefined) out[a] = data[a];
  return out;
};

export const handler = async (event) => {
  const col = event.queryStringParameters?.col || '';
  const db = initFirebase();
  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=120', // CDN 2dk cache — Firestore okuma maliyeti düşük kalır
    'Access-Control-Allow-Origin': 'https://egitimtakvimi.oneteamglobal.ai',
  };

  try {
    // Özel mod: kayıtlı eğitimler (sabit sorgu — sayfanın kendi sorgusuyla birebir)
    if (col === 'kayitli') {
      const snap = await db.collection('kayitli_egitimler')
        .where('kayeneFiltrelendi', '==', false)
        .orderBy('tarih', 'desc')
        .limit(2500)
        .get();
      const docs = snap.docs.map(d => {
        const { transcript, ...rest } = d.data();
        return { id: d.id, ...rest };
      });
      return { statusCode: 200, headers, body: JSON.stringify({ docs }) };
    }

    if (!(col in WHITELIST)) return { statusCode: 403, headers, body: '{"error":"col"}' };
    const snap = await db.collection(col).limit(500).get();
    const docs = snap.docs.map(d => ({ id: d.id, ...filtrele(d.data(), WHITELIST[col]) }));
    return { statusCode: 200, headers, body: JSON.stringify({ docs }) };
  } catch (e) {
    console.error('[veri-proxy]', col, e?.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: e?.message || 'hata' }) };
  }
};
