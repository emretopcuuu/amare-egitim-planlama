// netlify/functions/_metinTemizle.mjs
// ─────────────────────────────────────────────────────────────────────────
// Marka uyumu için tek noktadan metin temizleme.
// Tüm AI çıktıları + email template'leri cache'e/gönderime önce buradan geçer.
//
// Kurallar:
//   "network marketing" → "Doğrudan Satış"
//   "üye" (ve çekim ekleri) → "Marka Ortağı"
//     üyeler → Marka Ortakları
//     üyelik → Marka Ortaklığı
//     üyesi → Marka Ortağı  vb.
// ─────────────────────────────────────────────────────────────────────────

// ──── 1) "network marketing" ──────────────────────────────────────────────
const NM_REGEXLER = [
  { from: /NETWORK\s*MARKETING/g, to: 'DOĞRUDAN SATIŞ' },
  { from: /Network\s*Marketing/g, to: 'Doğrudan Satış' },
  { from: /network\s*marketing/gi, to: 'Doğrudan Satış' },
];

// ──── 2) "üye" morphology (çekim ekleri) ──────────────────────────────────
// Longest-first sırada: kısa eşleşmeler uzunları bozmasın
const UYE_FORMS = [
  // 11+ karakter
  ['üyelerimizden', 'Marka Ortaklarımızdan'],
  ['üyelerinizden', 'Marka Ortaklarınızdan'],
  ['üyelerimizin', 'Marka Ortaklarımızın'],
  ['üyelerinizin', 'Marka Ortaklarınızın'],
  ['üyelerimize',  'Marka Ortaklarımıza'],
  ['üyelerimizi',  'Marka Ortaklarımızı'],
  ['üyelerinize',  'Marka Ortaklarınıza'],
  ['üyelerinizi',  'Marka Ortaklarınızı'],
  // 10
  ['üyeliğiniz',   'Marka Ortaklığınız'],
  ['üyeliğimiz',   'Marka Ortaklığımız'],
  ['üyelikleri',   'Marka Ortaklıkları'],
  ['üyelerimiz',   'Marka Ortaklarımız'],
  ['üyeleriniz',   'Marka Ortaklarınız'],
  ['üyelerinden',  'Marka Ortaklarından'],
  // 9
  ['üyelikten',    'Marka Ortaklığından'],
  ['üyelikler',    'Marka Ortaklıkları'],
  ['üyelerini',    'Marka Ortaklarını'],
  ['üyelerine',    'Marka Ortaklarına'],
  // 8
  ['üyeliğin',     'Marka Ortaklığının'],
  ['üyelerin',     'Marka Ortaklarının'],
  // 7
  ['üyeliğe',      'Marka Ortaklığına'],
  ['üyeliği',      'Marka Ortaklığı'],
  ['üyeleri',      'Marka Ortakları'],
  ['üyeden',       'Marka Ortağından'],
  ['üyenin',       'Marka Ortağının'],
  // 6
  ['üyelik',       'Marka Ortaklığı'],
  ['üyeler',       'Marka Ortakları'],
  ['üyemiz',       'Marka Ortağımız'],
  ['üyeniz',       'Marka Ortağınız'],
  ['üyede',        'Marka Ortağında'],
  ['üyeye',        'Marka Ortağına'],
  ['üyeyi',        'Marka Ortağını'],
  // 5
  ['üyesi',        'Marka Ortağı'],
  // 4
  ['üyem',         'Marka Ortağım'],
  // 3 — son durak
  ['üye',          'Marka Ortağı'],
];

// Türkçe harf seti (kelime sınırı için)
const TR_LETTER = 'A-Za-zÇĞİıÖŞÜçğıöşüÂâ';

// Her form için case-insensitive regex (word boundary'li)
const UYE_REGEXLER = UYE_FORMS.map(([form, repl]) => ({
  re: new RegExp(`(?<![${TR_LETTER}0-9])${form}(?![${TR_LETTER}])`, 'gi'),
  repl,
}));

function detectCase(s) {
  if (!s) return 'lower';
  const upper = s.toLocaleUpperCase('tr-TR');
  const lower = s.toLocaleLowerCase('tr-TR');
  if (s === upper && s !== lower) return 'upper';
  // İlk harf büyük mü?
  const first = s.charAt(0);
  if (first === first.toLocaleUpperCase('tr-TR') && first !== first.toLocaleLowerCase('tr-TR')) {
    return 'title';
  }
  return 'lower';
}

function applyCase(replacement, caseKind) {
  // Marka tutarlılığı: tek istisna ALL CAPS — diğer her durumda Title Case kalır.
  // "üyemiz" cümle ortasında da → "Marka Ortağımız" (büyük M, büyük O)
  if (caseKind === 'upper') return replacement.toLocaleUpperCase('tr-TR');
  return replacement;
}

// ──── ANA TEMİZLİK ────────────────────────────────────────────────────────
export function metinTemizle(s) {
  if (s == null || typeof s !== 'string') return s;
  let out = s;
  // 1) network marketing
  for (const { from, to } of NM_REGEXLER) out = out.replace(from, to);
  // 2) üye + çekim ekleri (longest-first)
  for (const { re, repl } of UYE_REGEXLER) {
    out = out.replace(re, (match) => applyCase(repl, detectCase(match)));
  }
  return out;
}

// Object/array recursive (cache yazımı öncesi)
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
