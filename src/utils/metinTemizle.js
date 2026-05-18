// Frontend display-time safety net.
// AI cache'inde eski "network marketing" kaldıysa veya transcript chunks'ta
// geçtiyse görüntülenirken anında "Doğrudan Satış"a çevrilir.

const TEMIZ_REGEXLER = [
  { from: /NETWORK\s*MARKETING/g, to: 'DOĞRUDAN SATIŞ' },
  { from: /Network\s*Marketing/g, to: 'Doğrudan Satış' },
  { from: /network\s*marketing/gi, to: 'Doğrudan Satış' },
];

export function metinTemizle(s) {
  if (s == null) return s;
  if (typeof s !== 'string') return s;
  let out = s;
  for (const { from, to } of TEMIZ_REGEXLER) out = out.replace(from, to);
  return out;
}

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
