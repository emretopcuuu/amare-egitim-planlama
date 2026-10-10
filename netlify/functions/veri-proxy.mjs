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
  takvim: ['egitim', 'gun', 'tarih', 'saat', 'bitisSaati', 'sure', 'egitmen', 'yer', 'hafta', 'kategori', 'sehir', 'aciklama', 'katilimSayisi', 'tamamlandi', 'etkinlikTuru', 'mekanAdi', 'acikAdres', 'sunucular', 'programAkisi', 'katilTiklamaSayisi', 'zoomGercekKatilim', 'zoomOrtDakika', 'zoomEgri', 'canliKisi', 'biletLink'],
  konusmacilar: ['ad', 'unvan', 'biyografi', 'bio', 'kisaTanitim', 'linkedin', 'instagram', 'website', 'meslek', 'amareKariyer', 'doktorBrans', 'kariyerGecmis', 'katilimTarihi', 'sehir', 'favori_alintilar'],
  settings: null,
  sablonlar: null,
};

// Kayıtlı Eğitimler listesinin ihtiyaç duyduğu alanlar (sayfa + oynatıcı modalı + paylaşım).
// transcript / transcriptChunks / zaman damgaları bilinçli DIŞARIDA.
const KAYITLI_LISTE_ALANLARI = [
  'baslik', 'baslikDili', 'baslikOrijinal', 'aciklama', 'egitmenAdlari', 'egitmenler', 'embedUrl',
  'kategoriler', 'kategoriKaynagi', 'plays', 'izlenmeSayisi', 'puanOrt', 'puanSayisi', 'reactions',
  'sure', 'tarih', 'thumbnailUrl', 'vimeoId', 'vimeoUrl', 'transcriptVar', 'kayeneFiltrelendi', 'dil', 'eslesmemis',
];

const filtrele = (data, alanlar) => {
  if (!alanlar) return data;
  const out = {};
  for (const a of alanlar) if (data[a] !== undefined) out[a] = data[a];
  return out;
};

// Modern Netlify Functions API (Web Request/Response) — Lambda-compat DEĞİL,
// böylece 4KB env limiti uygulanmaz. Yardımcı: JSON yanıtı üret.
const jsonRes = (obj, status, headers) => new Response(typeof obj === 'string' ? obj : JSON.stringify(obj), { status, headers });
// Hata yanıtları için cache'siz header seti (403/500 CDN'e yapışmasın)
const hataHeaders = (h) => ({ ...h, 'Cache-Control': 'no-store', 'Netlify-CDN-Cache-Control': 'no-store' });

export default async (req) => {
  const col = new URL(req.url).searchParams.get('col') || '';
  const db = initFirebase();
  const headers = {
    'Content-Type': 'application/json',
    // Tarayıcı 2dk. CDN cache'i plain Cache-Control'e BAKMAZ — onun için
    // Netlify-CDN-Cache-Control şart: 5dk taze + 10dk stale-while-revalidate
    // (bayat kopya anında döner, arka planda tazelenir). durable = node'lar arası
    // paylaşımlı cache → cold start + tam koleksiyon okuması (~4sn) kullanıcıya yansımaz.
    // Yalnız public-read whitelist verisi servis edildiği için CDN cache güvenli.
    'Cache-Control': 'public, max-age=120',
    'Netlify-CDN-Cache-Control': 'public, durable, s-maxage=300, stale-while-revalidate=600',
    'Access-Control-Allow-Origin': 'https://egitimtakvimi.oneteamglobal.ai',
  };

  try {
    // Özel mod: kayıtlı eğitimler (sabit sorgu — sayfanın kendi sorgusuyla birebir)
    // transcriptChunks da striplenir — 918 doc'ta Whisper chunk'ları yanıtı
    // Lambda 6MB limitinin üstüne itiyordu (ResponseSizeTooLarge).
    if (col === 'kayitli') {
      // select(): Firestore → Lambda arası yalnız liste alanları akar. Tam belge okuması
      // (transcript+transcriptChunks ≈ belgenin %95'i, 982 belge ≈ 36 MB) soğukta ~8-10 sn
      // sürüyordu; projeksiyonla ~1-2 sn ve yanıt ~250 KB. Bu uç artık Kayıtlı Eğitimler
      // sayfasının BİRİNCİL veri yolu (Eki 2026 — "sayfa çok yavaş" saha şikâyeti).
      const snap = await db.collection('kayitli_egitimler')
        .where('kayeneFiltrelendi', '==', false)
        .orderBy('tarih', 'desc')
        .select(...KAYITLI_LISTE_ALANLARI)
        .limit(2500)
        .get();
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
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

    if (!(col in WHITELIST)) return jsonRes('{"error":"col"}', 403, hataHeaders(headers));
    const snap = await db.collection(col).limit(500).get();
    // Gizli eğitim (saha isteği Eyl 2026): hazırlık aşamasındaki etkinlik hiçbir public yüzeyde görünmez.
    // Bayrak whitelist'te DEĞİL — dışarı sızmasın, doc'un kendisi elenir.
    const docs = snap.docs
      .filter(d => !(col === 'takvim' && d.data()?.gizli === true))
      .map(d => ({ id: d.id, ...filtrele(d.data(), WHITELIST[col]) }));
    return jsonRes({ docs }, 200, headers);
  } catch (e) {
    console.error('[veri-proxy]', col, e?.message);
    // Hata yanıtı CDN'de CACHE'LENMEZ — yoksa geçici bir Firestore arızası 5dk yapışır kalır
    return jsonRes({ error: e?.message || 'hata' }, 500, hataHeaders(headers));
  }
};
