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

// Modern Netlify Functions API (Web Request/Response) — Lambda-compat DEĞİL,
// böylece 4KB env limiti uygulanmaz. Yardımcı: JSON yanıtı üret.
const jsonRes = (obj, status, headers) => new Response(typeof obj === 'string' ? obj : JSON.stringify(obj), { status, headers });

export default async (req) => {
  const col = new URL(req.url).searchParams.get('col') || '';
  const db = initFirebase();
  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=120', // CDN 2dk cache — Firestore okuma maliyeti düşük kalır
    'Access-Control-Allow-Origin': 'https://egitimtakvimi.oneteamglobal.ai',
  };

  try {
    // Özel mod: kayıtlı eğitimler (sabit sorgu — sayfanın kendi sorgusuyla birebir)
    // transcriptChunks da striplenir — 918 doc'ta Whisper chunk'ları yanıtı
    // Lambda 6MB limitinin üstüne itiyordu (ResponseSizeTooLarge).
    if (col === 'kayitli') {
      const snap = await db.collection('kayitli_egitimler')
        .where('kayeneFiltrelendi', '==', false)
        .orderBy('tarih', 'desc')
        .limit(2500)
        .get();
      const docs = snap.docs.map(d => {
        const { transcript, transcriptChunks, ...rest } = d.data();
        return { id: d.id, ...rest };
      });
      return jsonRes({ docs }, 200, headers);
    }

    // Özel mod: /ara sayfası için ULTRA hafif video listesi (yalnız arama alanları)
    if (col === 'kayitli-lite') {
      const snap = await db.collection('kayitli_egitimler')
        .where('kayeneFiltrelendi', '==', false)
        .select('baslik', 'egitmenAdlari', 'kategoriler', 'tarih', 'ozet.anaTema', 'transcriptVar')
        .limit(2500)
        .get();
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      return jsonRes({ docs }, 200, headers);
    }

    if (!(col in WHITELIST)) return jsonRes('{"error":"col"}', 403, headers);
    const snap = await db.collection(col).limit(500).get();
    const docs = snap.docs.map(d => ({ id: d.id, ...filtrele(d.data(), WHITELIST[col]) }));
    return jsonRes({ docs }, 200, headers);
  } catch (e) {
    console.error('[veri-proxy]', col, e?.message);
    return jsonRes({ error: e?.message || 'hata' }, 500, headers);
  }
};
