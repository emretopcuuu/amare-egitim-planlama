// netlify/functions/_metinTemizle.mjs
// ─────────────────────────────────────────────────────────────────────────
// Marka uyumu için tek noktadan metin temizleme.
// Tüm AI çıktıları cache'e yazılmadan önce buradan geçer.
//
// Kural: "network marketing" → "Doğrudan Satış" (case-aware)
// ─────────────────────────────────────────────────────────────────────────

const TEMIZ_REGEXLER = [
  // Tamamen büyük harf
  { from: /NETWORK\s*MARKETING/g, to: 'DOĞRUDAN SATIŞ' },
  // Title Case
  { from: /Network\s*Marketing/g, to: 'Doğrudan Satış' },
  // Karışık / küçük — case-insensitive son durak
  { from: /network\s*marketing/gi, to: 'Doğrudan Satış' },
];

export function metinTemizle(s) {
  if (s == null) return s;
  if (typeof s !== 'string') return s;
  let out = s;
  for (const { from, to } of TEMIZ_REGEXLER) out = out.replace(from, to);
  return out;
}

// Object/array içindeki tüm string'leri recursive temizler.
// Cache'e yazmadan önce JSON çıktısı için kullanılır.
export function metinTemizleDeep(value) {
  if (value == null) return value;
  if (typeof value === 'string') return metinTemizle(value);
  if (Array.isArray(value)) return value.map(metinTemizleDeep);
  if (typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = metinTemizleDeep(v);
    return out;
  }
  return value;
}
