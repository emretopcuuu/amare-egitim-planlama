// netlify/functions/egitmen-quotes.mjs
// ─────────────────────────────────────────────────────────────────────────
// GET /.netlify/functions/egitmen-quotes?coreId=tunc_tuncer
//
// Belirli bir eğitmenin tüm AI analizli videolarındaki ahaMoments'leri
// toplar ve "İlham Veren Sözleri" listesi olarak döner.
//
// Cache: egitmen_quotes_cache/{coreId}  (7 gün TTL)
// Public endpoint — auth gerekmez (yatırım önemli, paylaşılabilir).
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

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 gün

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

  try {
    const url = new URL(req.url);
    const coreId = (url.searchParams.get('coreId') || '').trim();
    // dil filtresi: TR, RU, EN, DE, NL veya 'all' (default tüm diller)
    const dil = (url.searchParams.get('dil') || 'all').toUpperCase();
    if (!coreId) return new Response(JSON.stringify({ error: 'coreId gerekli' }), {
      status: 400, headers: { 'Content-Type': 'application/json', ...CORS },
    });

    const db = admin.firestore();

    // 7 gün cache — dil farkı cache key'inde
    const cacheKey = dil === 'ALL' ? coreId : `${coreId}__${dil.toLowerCase()}`;
    const cacheRef = db.doc(`egitmen_quotes_cache/${cacheKey}`);
    const cacheSnap = await cacheRef.get();
    if (cacheSnap.exists) {
      const c = cacheSnap.data();
      const ts = c.timestamp?._seconds * 1000 || 0;
      if (Date.now() - ts < CACHE_TTL_MS) {
        return new Response(JSON.stringify({ ...c, cached: true }), {
          headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600', ...CORS },
        });
      }
    }

    // 1. Eğitmenin videolarını çek (max 100). Dil filtresi in-memory yapılır
    // çünkü "dil yoksa TR varsay" mantığı Firestore where ile yapılamaz.
    const videoSnap = await db.collection('kayitli_egitimler')
      .where('egitmenler', 'array-contains', coreId)
      .where('kayeneFiltrelendi', '==', false)
      .select('baslik', 'tarih', 'thumbnailUrl', 'sure', 'kategoriler', 'dil')
      .limit(100)
      .get();

    if (videoSnap.empty) {
      return new Response(JSON.stringify({
        coreId, sozler: [], videoSayisi: 0, cached: false,
        mesaj: 'Bu eğitmenin kayıtlı eğitimi yok.',
      }), { headers: { 'Content-Type': 'application/json', ...CORS } });
    }

    const videoMeta = {};
    videoSnap.docs.forEach(d => {
      const data = d.data();
      // Dil filtresi: dil eksikse TR varsay (Türkçe varsayılan)
      if (dil !== 'ALL') {
        const vDil = (data.dil || 'TR').toUpperCase();
        if (vDil !== dil) return;
      }
      videoMeta[d.id] = data;
    });
    const vimeoIds = Object.keys(videoMeta);
    const toplamVideo = videoSnap.size;

    if (vimeoIds.length === 0) {
      return new Response(JSON.stringify({
        coreId, dil, sozler: [], videoSayisi: 0, toplamVideo,
        mesaj: dil === 'ALL'
          ? 'Bu eğitmenin kayıtlı eğitimi yok.'
          : `Bu eğitmenin ${dil} dilinde kayıtlı eğitimi yok (toplam ${toplamVideo} video başka dilde).`,
        cached: false,
      }), { headers: { 'Content-Type': 'application/json', ...CORS } });
    }

    // 2. Her video için ai_analiz/main alt-doc'unu çek (batch 30)
    const sozler = [];
    let analiziOlanVideoSayisi = 0;

    for (let i = 0; i < vimeoIds.length; i += 30) {
      const batch = vimeoIds.slice(i, i + 30);
      const promises = batch.map(vid =>
        db.doc(`kayitli_egitimler/${vid}/ai_analiz/main`).get()
      );
      const snaps = await Promise.all(promises);
      snaps.forEach((s, idx) => {
        if (!s.exists) return;
        analiziOlanVideoSayisi++;
        const ai = s.data();
        const vid = batch[idx];
        const meta = videoMeta[vid] || {};
        if (Array.isArray(ai.ahaMoments)) {
          ai.ahaMoments.forEach(a => {
            if (a.text && a.text.length >= 30 && a.text.length <= 400) {
              // prompt v4'te "etki", v3'te "sebep" — ikisini de destekle
              const etkiYaSebep = a.etki || a.sebep || null;
              sozler.push({
                text: a.text,
                etki: etkiYaSebep,
                sebep: etkiYaSebep, // backward compat (frontend hala s.sebep okuyor olabilir)
                start: a.start || 0,
                vimeoId: vid,
                baslik: meta.baslik,
                thumbnailUrl: meta.thumbnailUrl,
                tarih: meta.tarih,
                kategori: Array.isArray(meta.kategoriler) ? meta.kategoriler[0] : null,
              });
            }
          });
        }
      });
    }

    // 3. Sırala: en yeni videolar önce, sonra random shuffle ile mix
    sozler.sort((a, b) => (b.tarih || '').localeCompare(a.tarih || ''));
    // Top 30 → shuffle (deterministic feel için ilk 30'dan rastgele 20 al)
    const top = sozler.slice(0, 40);
    const finalSozler = top
      .map(s => ({ ...s, _r: Math.random() }))
      .sort((a, b) => a._r - b._r)
      .slice(0, 20)
      .map(({ _r, ...rest }) => rest);

    const sonuc = {
      coreId,
      dil,
      sozler: finalSozler,
      toplamSoz: sozler.length,
      videoSayisi: vimeoIds.length,
      analiziOlanVideoSayisi,
    };

    try {
      await cacheRef.set({
        ...sonuc,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (e) {
      console.warn('[egitmen-quotes] cache write err:', e.message);
    }

    return new Response(JSON.stringify({ ...sonuc, cached: false }), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600', ...CORS },
    });

  } catch (err) {
    console.error('[egitmen-quotes] hata:', err.message);
    return new Response(JSON.stringify({ error: 'Sistem hatası', detail: err.message.slice(0, 200) }), {
      status: 500, headers: { 'Content-Type': 'application/json', ...CORS },
    });
  }
};
