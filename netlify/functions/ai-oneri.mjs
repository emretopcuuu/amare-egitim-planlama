// netlify/functions/ai-oneri.mjs
// ─────────────────────────────────────────────────────────────────────────
// GET /.netlify/functions/ai-oneri
//   Authorization: Bearer <Firebase ID Token>
//
// Kullanıcının izleme geçmişine + favorilerine + curriculum'una göre
// AI ile 5 video önerisi yapar.
//
// Yaklaşım:
//   - Kullanıcının izledikleri + favorileri + rank → bağlam
//   - kayitli_egitimler'den (kayene değil) 100 başlık ile birlikte LLM'e gönder
//   - LLM en uygun 5'i seçer (içerik tabanlı)
//
// Cache: users/{uid}/ai_cache/oneri (12 saat)
// Embedding-vari değil ama LLM-as-recommender — küçük katalog için yeterli
// ─────────────────────────────────────────────────────────────────────────

import admin from 'firebase-admin';
import { metinTemizleDeep } from './_metinTemizle.mjs';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    }),
  });
}

const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const SISTEM_PROMPT = `Sen Doğrudan Satış eğitim platformu için içerik öneri motorusun.
Kullanıcının: izleme geçmişi, yarım kalan videolar, takip ettiği eğitmenler,
favorileri ve kariyer rank'ına bakarak SONRAKI 5 videoyu öner.

ÖNERİ STRATEJİSİ (3 kategori, dengeli karışım):

1. KATEGORI: "devam" — Yarım kalan video'ya benzer içerik veya seri devamı
   (kullanıcı %30-80 ilerlemişse o eğitmenin başka videosu / aynı kategoride başka)
2. KATEGORI: "ilgi" — Sık izlediği KATEGORİ veya takip ettiği EĞİTMEN'den yeni
3. KATEGORI: "kesif" — Hiç izlemediği ama rank'ına uygun, yüksek puanlı (puanOrt 4+)

Kurallar:
- Toplam 5 öneri: ~2 "ilgi" + ~2 "kesif" + ~1 "devam" (varsa)
- Her öneri: vimeoId, kategoriEtiket (devam/ilgi/kesif), sebep (1 etkili cümle)
- Çeşitlilik: aynı eğitmen 2'den fazla olmasın, aynı KATEGORİ 3'ten fazla olmasın
- Kullanıcı tam izlediği videoları ÖNERME (zaten katalogtan çıkarıldı)
- "sebep" konuya ÖZGÜ olsun ("X eğitimini izledin" / "Y eğitmenini takip ediyorsun")
- Rank'a uygun ya da 1 üst seviyeye yönlendirici (Diamond hedefi varsa Diamond stratejisi)
- MARKA: "network marketing" yazma — her zaman "Doğrudan Satış"
- "vurguluyor", "anlatıyor" gibi pasif kelimeler KULLANMA — aktif "sana X öğretir/gösterir"
- Sadece JSON çıktı, açıklama eklemeden

ÇIKTI FORMATI:
{
  "oneriler": [
    {
      "vimeoId": "...",
      "kategoriEtiket": "devam" | "ilgi" | "kesif",
      "sebep": "Aktif tonlu, kullanıcıya özel 1 cümle (max 100 char)"
    }
  ]
}`;

async function callLLM(prompt) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://egitimtakvimi.oneteamglobal.ai',
      'X-Title': 'One Team Education',
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: [
        { role: 'system', content: SISTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      temperature: 0.5,
      max_tokens: 1024,
      response_format: { type: 'json_object' },
    }),
  });
  if (!res.ok) {
    const errText = (await res.text()).slice(0, 300);
    throw new Error(`OpenRouter ${res.status}: ${errText}`);
  }
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content || '';
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Cevap JSON değil');
  return JSON.parse(match[0]);
}

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

  try {
    if (!OPENROUTER_KEY) {
      return new Response(JSON.stringify({ error: 'OPENROUTER_API_KEY eksik' }), {
        status: 500, headers: { 'Content-Type': 'application/json', ...CORS },
      });
    }

    const auth = req.headers.get('authorization') || '';
    const m = auth.match(/^Bearer\s+(.+)$/i);
    if (!m) return new Response(JSON.stringify({ error: 'Token gerekli' }), {
      status: 401, headers: { 'Content-Type': 'application/json', ...CORS },
    });
    let decoded;
    try { decoded = await admin.auth().verifyIdToken(m[1]); }
    catch { return new Response(JSON.stringify({ error: 'Geçersiz token' }), {
      status: 401, headers: { 'Content-Type': 'application/json', ...CORS },
    }); }
    const uid = decoded.uid;

    // Cache (6 saat — eskiden 12, kullanıcı geçmişi değiştikçe daha taze)
    const cacheRef = admin.firestore().doc(`users/${uid}/ai_cache/oneri`);
    const cacheSnap = await cacheRef.get();
    if (cacheSnap.exists) {
      const c = cacheSnap.data();
      const ts = c.timestamp?._seconds * 1000 || 0;
      if (Date.now() - ts < 6 * 60 * 60 * 1000) {
        return new Response(JSON.stringify({ ...c.sonuc, cached: true }), {
          headers: { 'Content-Type': 'application/json', ...CORS },
        });
      }
    }

    // 1. İzleme geçmişi + yarım kalan videolar (watch_progress)
    let izlenenler = [];
    let yarimKalanlar = []; // %30-80 arası — devam ettirmeye uygun
    try {
      const wpSnap = await admin.firestore().collection(`users/${uid}/watch_progress`)
        .orderBy('updatedAt', 'desc').limit(30).get();
      wpSnap.docs.forEach(d => {
        const data = d.data();
        const ilerleme = data.ilerleme || data.percent || 0;
        izlenenler.push(d.id);
        if (ilerleme >= 30 && ilerleme < 80) {
          yarimKalanlar.push({ vimeoId: d.id, ilerleme });
        }
      });
    } catch {}

    // 2. Takip ettiği eğitmenler (yüksek sinyal — kişi aktif tercih bildirmiş)
    let takipEgitmenler = [];
    try {
      const teSnap = await admin.firestore().collection(`users/${uid}/takip_egitmen`).limit(20).get();
      takipEgitmenler = teSnap.docs.map(d => d.id);
    } catch {}

    // 3. Favori videolar (kalp atılanlar)
    let favoriler = [];
    try {
      const ufSnap = await admin.firestore().collection(`users/${uid}/takip`).limit(20).get();
      favoriler = ufSnap.docs.map(d => d.id);
    } catch {}

    // 4. Rank + onboarding ile öğrendiklerimiz (ilgi alanı)
    let kullaniciRank = null;
    let ilgiAlanlari = [];
    try {
      const userSnap = await admin.firestore().doc(`users/${uid}`).get();
      if (userSnap.exists) {
        const ud = userSnap.data();
        kullaniciRank = ud.rank || null;
        ilgiAlanlari = ud.ilgiAlanlari || ud.onboarding?.ilgiAlanlari || [];
      }
    } catch {}

    // 4. Tüm kataloglu video başlıkları (kompakt)
    const vSnap = await admin.firestore()
      .collection('kayitli_egitimler')
      .where('kayeneFiltrelendi', '==', false)
      .limit(200)
      .get();
    // Tam izlediklerini çıkar (ilerlemesi 90+ olanları)
    const tamIzlenenSet = new Set();
    try {
      const wpSnap2 = await admin.firestore().collection(`users/${uid}/watch_progress`)
        .where('ilerleme', '>=', 90).get();
      wpSnap2.docs.forEach(d => tamIzlenenSet.add(d.id));
    } catch {}

    const katalog = vSnap.docs
      .filter(d => !tamIzlenenSet.has(d.data().vimeoId))
      .map(d => {
        const data = d.data();
        return {
          vimeoId: data.vimeoId,
          baslik: (data.baslik || '').slice(0, 100),
          kategoriler: (data.kategoriler || []).slice(0, 2),
          egitmenAdlari: (data.egitmenAdlari || []).slice(0, 2),
          puanOrt: data.puanOrt || null,
        };
      })
      .slice(0, 150);

    if (katalog.length === 0) {
      return new Response(JSON.stringify({ oneriler: [], sebep: 'Katalog boş' }), {
        headers: { 'Content-Type': 'application/json', ...CORS },
      });
    }

    // 5. LLM'e zengin prompt — tüm sinyaller
    const prompt = `KULLANICI PROFİLİ:
Rank: ${kullaniciRank || 'Belirsiz'}
${ilgiAlanlari.length > 0 ? `İlgi alanları: ${ilgiAlanlari.join(', ')}` : ''}

İZLEME GEÇMİŞİ (son izlediği vimeoId'ler):
${izlenenler.slice(0, 15).join(', ') || 'henüz yok'}

YARIM KALAN VİDEOLAR (%30-80 ilerlemiş, devam etmeye uygun):
${yarimKalanlar.length > 0
    ? yarimKalanlar.slice(0, 5).map(y => `${y.vimeoId} (%${Math.round(y.ilerleme)})`).join(', ')
    : 'yok'}

TAKİP ETTİĞİ EĞİTMENLER (kişi aktif olarak seçmiş — yüksek sinyal):
${takipEgitmenler.slice(0, 10).join(', ') || 'henüz takip yok'}

FAVORİ VİDEOLARI (kalp attı):
${favoriler.slice(0, 5).join(', ') || 'henüz yok'}

EĞİTİM KATALOĞU (vimeoId · başlık · kategori · eğitmenler · puan):
${katalog.map(k => `${k.vimeoId} · ${k.baslik} · ${k.kategoriler.join('/')} · ${(k.egitmenAdlari || []).slice(0,2).join(',')} · ${k.puanOrt ? k.puanOrt.toFixed(1) : '-'}`).join('\n')}

Bu kullanıcıya 5 öneri yap. Stratejide ~1 devam + ~2 ilgi + ~2 keşif karışımı tut.
"sebep" alanında kullanıcının VERİSİNE özel atıf yap (örn. "Tunç Tuncer'i takip ediyorsun, bu da onun" / "X eğitimini %60 izledin, devamı niteliğinde").`;

    const sonuc = await callLLM(prompt);

    // 6. Önerileri video metadata ile zenginleştir
    const oneriMap = {};
    vSnap.docs.forEach(d => { oneriMap[d.data().vimeoId] = { id: d.id, ...d.data() }; });
    const zenginOneriler = (sonuc.oneriler || [])
      .filter(o => oneriMap[o.vimeoId])
      .slice(0, 5)
      .map(o => ({
        vimeoId: o.vimeoId,
        sebep: o.sebep,
        kategoriEtiket: o.kategoriEtiket || 'kesif', // devam | ilgi | kesif
        baslik: oneriMap[o.vimeoId].baslik,
        thumbnailUrl: oneriMap[o.vimeoId].thumbnailUrl,
        egitmenAdlari: oneriMap[o.vimeoId].egitmenAdlari || [],
        kategoriler: oneriMap[o.vimeoId].kategoriler || [],
        puanOrt: oneriMap[o.vimeoId].puanOrt || null,
        sure: oneriMap[o.vimeoId].sure || null,
      }));

    const cikti = metinTemizleDeep({ oneriler: zenginOneriler });

    // Cache
    try {
      await cacheRef.set({
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        sonuc: cikti,
      });
    } catch {}

    return new Response(JSON.stringify({ ...cikti, cached: false }), {
      headers: { 'Content-Type': 'application/json', ...CORS },
    });

  } catch (err) {
    console.error('[ai-oneri] hata:', err.message);
    return new Response(JSON.stringify({ error: 'Sistem hatası', detail: err.message.slice(0, 200) }), {
      status: 500, headers: { 'Content-Type': 'application/json', ...CORS },
    });
  }
};
