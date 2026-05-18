// Frontend display-time safety net.
// AI cache'inde / transcript'te / server response'unda kaçan "network marketing"
// veya "üye" terimini render anında düzeltir.

// ──── 1) "network marketing" ──────────────────────────────────────────────
const NM_REGEXLER = [
  { from: /NETWORK\s*MARKETING/g, to: 'DOĞRUDAN SATIŞ' },
  { from: /Network\s*Marketing/g, to: 'Doğrudan Satış' },
  { from: /network\s*marketing/gi, to: 'Doğrudan Satış' },
];

// ──── 2) "üye" morphology ─────────────────────────────────────────────────
const UYE_FORMS = [
  ['üyelerimizden', 'Marka Ortaklarımızdan'],
  ['üyelerinizden', 'Marka Ortaklarınızdan'],
  ['üyelerimizin', 'Marka Ortaklarımızın'],
  ['üyelerinizin', 'Marka Ortaklarınızın'],
  ['üyelerimize',  'Marka Ortaklarımıza'],
  ['üyelerimizi',  'Marka Ortaklarımızı'],
  ['üyelerinize',  'Marka Ortaklarınıza'],
  ['üyelerinizi',  'Marka Ortaklarınızı'],
  ['üyeliğiniz',   'Marka Ortaklığınız'],
  ['üyeliğimiz',   'Marka Ortaklığımız'],
  ['üyelikleri',   'Marka Ortaklıkları'],
  ['üyelerimiz',   'Marka Ortaklarımız'],
  ['üyeleriniz',   'Marka Ortaklarınız'],
  ['üyelerinden',  'Marka Ortaklarından'],
  ['üyelikten',    'Marka Ortaklığından'],
  ['üyelikler',    'Marka Ortaklıkları'],
  ['üyelerini',    'Marka Ortaklarını'],
  ['üyelerine',    'Marka Ortaklarına'],
  ['üyeliğin',     'Marka Ortaklığının'],
  ['üyelerin',     'Marka Ortaklarının'],
  ['üyeliğe',      'Marka Ortaklığına'],
  ['üyeliği',      'Marka Ortaklığı'],
  ['üyeleri',      'Marka Ortakları'],
  ['üyeden',       'Marka Ortağından'],
  ['üyenin',       'Marka Ortağının'],
  ['üyelik',       'Marka Ortaklığı'],
  ['üyeler',       'Marka Ortakları'],
  ['üyemiz',       'Marka Ortağımız'],
  ['üyeniz',       'Marka Ortağınız'],
  ['üyede',        'Marka Ortağında'],
  ['üyeye',        'Marka Ortağına'],
  ['üyeyi',        'Marka Ortağını'],
  ['üyesi',        'Marka Ortağı'],
  ['üyem',         'Marka Ortağım'],
  ['üye',          'Marka Ortağı'],
];

const TR_LETTER = 'A-Za-zÇĞİıÖŞÜçğıöşüÂâ';
const UYE_REGEXLER = UYE_FORMS.map(([form, repl]) => ({
  re: new RegExp(`(?<![${TR_LETTER}0-9])${form}(?![${TR_LETTER}])`, 'gi'),
  repl,
}));

function detectCase(s) {
  if (!s) return 'lower';
  const upper = s.toLocaleUpperCase('tr-TR');
  const lower = s.toLocaleLowerCase('tr-TR');
  if (s === upper && s !== lower) return 'upper';
  const first = s.charAt(0);
  if (first === first.toLocaleUpperCase('tr-TR') && first !== first.toLocaleLowerCase('tr-TR')) {
    return 'title';
  }
  return 'lower';
}
function applyCase(replacement, caseKind) {
  // Marka tutarlılığı: tek istisna ALL CAPS — diğer her durumda Title Case kalır.
  if (caseKind === 'upper') return replacement.toLocaleUpperCase('tr-TR');
  return replacement;
}

export function metinTemizle(s) {
  if (s == null || typeof s !== 'string') return s;
  let out = s;
  for (const { from, to } of NM_REGEXLER) out = out.replace(from, to);
  for (const { re, repl } of UYE_REGEXLER) {
    out = out.replace(re, (match) => applyCase(repl, detectCase(match)));
  }
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
