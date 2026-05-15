// Onboarding cevaplarının insan-okuyabilir etiketleri.
// Backend ham JSON döner (örn. funnel_answers: {0: 1, 1: 0, ...}),
// burada index'leri etikete çeviriyoruz.
//
// Kaynak: deploy/lib/i18n-content.js (oneteamglobal.ai onboarding)

// profile_qs ile aynı sıra
export const PROFILE_QUESTIONS = [
  {
    key: 'yas',
    soru: 'Yaş',
    opts: ['18-25', '26-35', '36-45', '46-55', '56-65', '65+'],
  },
  {
    key: 'meslek',
    soru: 'Meslek',
    opts: ['Maaşlı çalışan', 'Girişimci', 'Serbest meslek / Freelancer', 'Emekli', 'Öğrenci', 'Ev hanımı / Ev erkeği'],
  },
  {
    key: 'heyecan',
    soru: 'Heyecanlandıran',
    opts: ['Gelir potansiyeli', 'İnsanlara yardım', 'Kişisel gelişim', 'Zaman özgürlüğü', 'Kendi patronu olmak', 'Pasif gelir'],
    multi: true,
  },
  {
    key: 'tanitim',
    soru: 'Tanıtım',
    freeText: true,
  },
];

export const FUNNEL_QUESTIONS = [
  {
    key: 'motivasyon',
    soru: 'Motivasyon',
    opts: [
      'Daha fazla kazanmak',
      'Zaman özgürlüğü',
      'Kendi patronu olmak',
      'Aile için daha iyi gelecek',
      'Borçlardan kurtulmak',
      'Hayalleri gerçekleştirmek',
      'Erken emekli olmak',
    ],
  },
  {
    key: 'korku',
    soru: 'En büyük endişe',
    opts: [
      '"Hayır" der reddeder',
      'Nasıl anlatacağımı bilmiyorum',
      'Saadet zinciri sanırlar',
    ],
  },
  {
    key: 'cevre',
    soru: 'İlk akla gelen kişi',
    opts: [
      'Hemen destekler',
      'Merak eder — açık fikirli',
      'Şüpheci — ikna edilebilir',
      'Ne desem hayır der',
    ],
  },
  {
    key: 'haftaSaat',
    soru: 'Haftalık ayıracağı zaman',
    opts: [
      '3-5 saat',
      '5-10 saat',
      '10+ saat',
      '20+ saat',
    ],
  },
  // 5. soru "önce öğren" — gösterilmesi anlamsız, gizli
];

// Verilen bio_data JSON ({ yas, meslek, heyecan, tanitim, bio_metin, v:1 })
// → render edilebilir array: yaş, meslek, heyecan (chip'ler)
// Tanıtım metni ayrı, free text — kullanıcı yazdıysa
export function parseProfileAnswers(bioData) {
  if (!bioData || typeof bioData !== 'object') return { chips: [], tanitim: null };
  const chips = [];

  // Yaş
  if (bioData.yas !== undefined && bioData.yas !== null) {
    const opts = PROFILE_QUESTIONS[0].opts;
    chips.push({
      key: 'yas',
      soru: 'Yaş',
      cevap: typeof bioData.yas === 'number' ? opts[bioData.yas] : 'Diğer',
    });
  }

  // Meslek
  if (bioData.meslek !== undefined && bioData.meslek !== null) {
    const opts = PROFILE_QUESTIONS[1].opts;
    chips.push({
      key: 'meslek',
      soru: 'Meslek',
      cevap: typeof bioData.meslek === 'number' ? opts[bioData.meslek] : 'Diğer',
    });
  }

  // Heyecanlandıran (multi)
  if (bioData.heyecan !== undefined && bioData.heyecan !== null) {
    const opts = PROFILE_QUESTIONS[2].opts;
    let cevap;
    if (Array.isArray(bioData.heyecan)) {
      cevap = bioData.heyecan.map(i => opts[i]).filter(Boolean).join(', ');
    } else if (typeof bioData.heyecan === 'number') {
      cevap = opts[bioData.heyecan];
    } else {
      cevap = 'Diğer';
    }
    if (cevap) chips.push({ key: 'heyecan', soru: 'Heyecanlandıran', cevap });
  }

  // Tanıtım (free text)
  const tanitim = typeof bioData.tanitim === 'string' && bioData.tanitim.trim()
    ? bioData.tanitim.trim()
    : null;

  return { chips, tanitim };
}

// Verilen funnel_answers JSON ({0: 1, 1: 0, ...}) → render edilebilir array
// Output: [{ key, soru, cevap }]
export function parseFunnelAnswers(funnelAnswers) {
  if (!funnelAnswers || typeof funnelAnswers !== 'object') return [];
  const out = [];
  // Sadece ilk 4 soru gösterilir (5. "önce öğren" filler)
  for (let i = 0; i < 4; i++) {
    const q = FUNNEL_QUESTIONS[i];
    if (!q) continue;
    const ans = funnelAnswers[i] ?? funnelAnswers[String(i)];
    if (ans === undefined || ans === null) continue;

    let cevap;
    if (Array.isArray(ans)) {
      cevap = ans.map(idx => q.opts[idx] || '').filter(Boolean).join(', ');
    } else if (ans === 'other') {
      cevap = 'Diğer';
    } else if (typeof ans === 'number') {
      cevap = q.opts[ans] || `Seçenek ${ans + 1}`;
    } else {
      cevap = String(ans);
    }
    if (cevap) out.push({ key: q.key, soru: q.soru, cevap });
  }
  return out;
}
