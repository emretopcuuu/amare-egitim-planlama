// netlify/functions/_synonyms.mjs
// ─────────────────────────────────────────────────────────────────────────
// Türkçe Doğrudan Satış / liderlik eğitimleri için sabit eş anlamlı
// kelime sözlüğü. transcript-search.mjs içinde opt-in `synonimGenislet`
// flag'i ile kullanılır.
//
// Tasarım kararı: LLM çağrısı YAPMA — latency + cost. Sabit sözlük yeterli
// çünkü domain dar (eğitim/satış/liderlik).
// ─────────────────────────────────────────────────────────────────────────

const RAW = {
  // Liderlik / yönetim
  'lider': ['önder', 'lider', 'liderlik', 'lidership'],
  'liderlik': ['lider', 'önderlik', 'yöneticilik', 'liderlik'],
  'takım': ['ekip', 'takım', 'grup', 'kadro'],
  'ekip': ['takım', 'ekip', 'grup', 'kadro'],
  'yönetim': ['yönetim', 'idare', 'yönetme'],

  // Satış / pazarlama
  'satış': ['satış', 'satım', 'satıs', 'sales'],
  'müşteri': ['müşteri', 'müsteri', 'tüketici', 'alıcı', 'client'],
  'davet': ['davet', 'çağrı', 'invite', 'davetiye'],
  'pazarlama': ['pazarlama', 'satış', 'tanıtım', 'marketing'],
  'kapanış': ['kapanış', 'kapama', 'sonuç', 'close'],

  // Motivasyon / başarı
  'motivasyon': ['motivasyon', 'tutku', 'arzu', 'istek', 'enerji'],
  'başarı': ['başarı', 'basari', 'success', 'kazanç', 'zafer'],
  'hedef': ['hedef', 'amaç', 'gaye', 'goal', 'vizyon'],
  'vizyon': ['vizyon', 'görüş', 'hedef', 'amaç'],
  'tutku': ['tutku', 'motivasyon', 'arzu', 'passion'],

  // Kişisel gelişim
  'gelişim': ['gelişim', 'gelisme', 'büyüme', 'ilerleme'],
  'değişim': ['değişim', 'değişme', 'dönüşüm'],
  'inanç': ['inanç', 'inanma', 'iman', 'güven'],
  'düşünce': ['düşünce', 'fikir', 'görüş', 'thought'],

  // Para / başarı
  'para': ['para', 'kazanç', 'gelir', 'finans'],
  'gelir': ['gelir', 'para', 'kazanç', 'maaş'],
  'kazanç': ['kazanç', 'gelir', 'para', 'fayda'],
  'finansal': ['finansal', 'mali', 'para', 'finans'],
  'finans': ['finans', 'finansal', 'para', 'mali'],

  // Sağlık / ürün
  'sağlık': ['sağlık', 'saglik', 'health', 'iyilik'],
  'ürün': ['ürün', 'urun', 'product', 'mal'],

  // Eğitim
  'eğitim': ['eğitim', 'egitim', 'training', 'kurs', 'ders'],
  'öğrenme': ['öğrenme', 'ogrenme', 'learning', 'edinme'],

  // Cesaret / korku
  'korku': ['korku', 'fear', 'çekinme', 'tedirginlik'],
  'cesaret': ['cesaret', 'courage', 'yüreklilik', 'gözüpeklik'],
};

// Index'i her yöne tara — synonim verildiğinde tüm grup gelsin
function indexBuild() {
  const idx = new Map(); // kelime → Set(synonyms)
  for (const [key, list] of Object.entries(RAW)) {
    const grup = new Set([key, ...list]);
    for (const w of grup) {
      const k = w.toLowerCase();
      if (!idx.has(k)) idx.set(k, new Set());
      for (const s of grup) idx.get(k).add(s.toLowerCase());
    }
  }
  return idx;
}

const INDEX = indexBuild();

// q kelimesini synonyms listesine genişletir (max 5 varyant)
export function expandSynonyms(q) {
  const norm = String(q || '').trim().toLowerCase();
  if (!norm) return [];
  const grup = INDEX.get(norm);
  if (!grup) return [norm];
  return Array.from(grup).slice(0, 5);
}

// Tek sorgu için (boşluklu ise) kelime kelime expand etmek YERİNE
// sadece tam sorgu eşleşirse genişlet. Çoklu kelime sorguları için
// frontend ayrı arama yapsın.
export function hasSynonyms(q) {
  return INDEX.has(String(q || '').trim().toLowerCase());
}
