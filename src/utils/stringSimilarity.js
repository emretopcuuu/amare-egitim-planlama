// Basit string benzerlik — Levenshtein distance + normalize
// "Yanlış arama → 'X demek istediniz mi?'" için kullanılır.

const norm = (s) => (s || '').toLocaleUpperCase('tr-TR').replace(/[İI]/g, 'I').replace(/[ÇĞÖŞÜ]/g, (c) =>
  ({ Ç: 'C', Ğ: 'G', Ö: 'O', Ş: 'S', Ü: 'U' }[c] || c)
).trim();

export function levenshtein(a, b) {
  const s = norm(a);
  const t = norm(b);
  const m = s.length, n = t.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const v0 = new Array(n + 1);
  const v1 = new Array(n + 1);
  for (let j = 0; j <= n; j++) v0[j] = j;
  for (let i = 0; i < m; i++) {
    v1[0] = i + 1;
    for (let j = 0; j < n; j++) {
      const cost = s[i] === t[j] ? 0 : 1;
      v1[j + 1] = Math.min(
        v1[j] + 1,        // ekle
        v0[j + 1] + 1,    // sil
        v0[j] + cost,     // değiştir
      );
    }
    for (let j = 0; j <= n; j++) v0[j] = v1[j];
  }
  return v0[n];
}

// 0-1 arası benzerlik skoru
export function similarity(a, b) {
  const longer = Math.max(a.length, b.length);
  if (longer === 0) return 1;
  return 1 - levenshtein(a, b) / longer;
}

// Liste içinden q'a en yakın 1-3 öneriyi bul
// minSimilarity: 0-1, default 0.5
export function tahminEt(q, liste, getStr, max = 3, minSimilarity = 0.5) {
  if (!q || !liste?.length) return [];
  const sQ = norm(q);
  // Score her item
  const scored = liste
    .map(item => {
      const s = norm(getStr(item));
      // Substring match — yüksek puan
      if (s.includes(sQ) || sQ.includes(s)) return { item, score: 0.9 };
      // Start match
      if (s.startsWith(sQ.slice(0, Math.min(3, sQ.length)))) return { item, score: 0.85 };
      // Levenshtein benzerlik
      return { item, score: similarity(sQ, s) };
    })
    .filter(x => x.score >= minSimilarity)
    .sort((a, b) => b.score - a.score)
    .slice(0, max);
  return scored.map(x => x.item);
}

export default { levenshtein, similarity, tahminEt };
