// Amare rank hiyerarşisi — DB'deki amare_raw_members.rank string'lerinden
// curriculum sistemi için key'e map edilir.
//
// 13 seviye: Brand Partner (başlangıç) → Presidential Diamond (en üst)

export const RANK_SIRALAMA = [
  { key: 'brand_partner',        label: 'Brand Partner',        sira: 1,  renk: 'slate' },
  { key: 'brand_builder',        label: 'Brand Builder',        sira: 2,  renk: 'sky' },
  { key: 'bronze',               label: 'Bronze',               sira: 3,  renk: 'orange' },
  { key: 'silver',                label: 'Silver',               sira: 4,  renk: 'zinc' },
  { key: 'gold',                  label: 'Gold',                 sira: 5,  renk: 'yellow' },
  { key: 'platinum',              label: 'Platinum',             sira: 6,  renk: 'stone' },
  { key: 'leader',                label: 'Leader',               sira: 7,  renk: 'emerald' },
  { key: 'senior_leader',         label: 'Senior Leader',        sira: 8,  renk: 'green' },
  { key: 'executive_leader',      label: 'Executive Leader',     sira: 9,  renk: 'teal' },
  { key: 'diamond',               label: 'Diamond',              sira: 10, renk: 'cyan' },
  { key: 'one_star_diamond',      label: '1-Star Diamond',       sira: 11, renk: 'sky' },
  { key: 'two_star_diamond',      label: '2-Star Diamond',       sira: 12, renk: 'purple' },
  { key: 'three_star_diamond',    label: '3-Star Diamond',       sira: 13, renk: 'fuchsia' },
  { key: 'presidential_diamond',  label: 'Presidential Diamond', sira: 14, renk: 'amber' },
];

// DB'den gelen rank string'ini key'e çevir — varyasyonları yakalar:
//   "Presidential Diamond", "presidential_diamond", "1-Star Diamond",
//   "One Star Diamond", "1 star diamond" hepsi → 'one_star_diamond'
export function rankStringToKey(s) {
  if (!s || typeof s !== 'string') return null;
  const norm = s.toLowerCase().trim()
    .replace(/-/g, ' ')      // tire → boşluk
    .replace(/\s+/g, ' ');   // çoklu boşluk → tek

  // Sayı → kelime dönüşümü (1-star → one-star)
  const numToWord = { '1': 'one', '2': 'two', '3': 'three' };
  const altNorm = norm.replace(/^(\d)(\s+star)/, (_, n, rest) => (numToWord[n] || n) + rest);

  for (const r of RANK_SIRALAMA) {
    const labelNorm = r.label.toLowerCase().replace(/-/g, ' ');
    if (labelNorm === norm || labelNorm === altNorm) return r.key;
    if (r.key === norm.replace(/\s+/g, '_')) return r.key;
    if (r.key === altNorm.replace(/\s+/g, '_')) return r.key;
  }
  return null;
}

// Key'den rank objesi
export function getRankByKey(key) {
  return RANK_SIRALAMA.find(r => r.key === key) || null;
}

// Sıra numarasından rank
export function getRankBySira(sira) {
  return RANK_SIRALAMA.find(r => r.sira === sira) || null;
}

// Kullanıcının mevcut rank'inin sırasını bul
export function getSiraFromString(s) {
  const key = rankStringToKey(s);
  return key ? getRankByKey(key)?.sira ?? null : null;
}

// Hangi rank'ler tamamlanmış sayılır?
// Mevcut rank: presidential_diamond (sira 13)
// → Tamamlanmış: sira 1-12 (önceki hepsi)
// → Aktif: sira 13
// → Kilitli: yok (en üstte)
export function classifyRanks(currentRankKey) {
  const current = getRankByKey(currentRankKey);
  if (!current) {
    // Bilinmeyen rank → hepsini kilitli kabul et, sadece brand_partner aç
    return {
      tamamlanan: [],
      aktif: getRankByKey('brand_partner'),
      kilitli: RANK_SIRALAMA.slice(1),
    };
  }
  return {
    tamamlanan: RANK_SIRALAMA.filter(r => r.sira < current.sira),
    aktif: current,
    kilitli: RANK_SIRALAMA.filter(r => r.sira > current.sira),
  };
}

// Rank rengini Tailwind class'larına çevir
export function rankRenkClass(rank) {
  const renkMap = {
    slate:   { bg: 'from-slate-400 to-slate-600',   chip: 'bg-slate-500/25 text-slate-100 border-slate-300/40' },
    sky:     { bg: 'from-sky-400 to-sky-600',       chip: 'bg-sky-500/25 text-sky-100 border-sky-300/40' },
    orange:  { bg: 'from-orange-500 to-amber-700',  chip: 'bg-orange-500/25 text-orange-100 border-orange-300/40' },
    zinc:    { bg: 'from-zinc-300 to-zinc-500',     chip: 'bg-zinc-400/25 text-zinc-100 border-zinc-300/40' },
    yellow:  { bg: 'from-yellow-400 to-yellow-600', chip: 'bg-yellow-500/25 text-yellow-100 border-yellow-300/40' },
    stone:   { bg: 'from-stone-300 to-stone-500',   chip: 'bg-stone-400/25 text-stone-100 border-stone-300/40' },
    emerald: { bg: 'from-emerald-400 to-teal-600',  chip: 'bg-emerald-500/25 text-emerald-100 border-emerald-300/40' },
    green:   { bg: 'from-green-400 to-emerald-600', chip: 'bg-green-500/25 text-green-100 border-green-300/40' },
    teal:    { bg: 'from-teal-400 to-cyan-600',     chip: 'bg-teal-500/25 text-teal-100 border-teal-300/40' },
    cyan:    { bg: 'from-cyan-400 to-blue-600',     chip: 'bg-cyan-500/25 text-cyan-100 border-cyan-300/40' },
    purple:  { bg: 'from-purple-500 to-indigo-700', chip: 'bg-purple-500/25 text-purple-100 border-purple-300/40' },
    fuchsia: { bg: 'from-fuchsia-500 to-pink-700',  chip: 'bg-fuchsia-500/25 text-fuchsia-100 border-fuchsia-300/40' },
    amber:   { bg: 'from-amber-400 to-orange-600',  chip: 'bg-amber-400/25 text-amber-100 border-amber-300/40' },
  };
  return renkMap[rank?.renk] || renkMap.amber;
}
