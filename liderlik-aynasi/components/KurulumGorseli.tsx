// KURULUM GÖRSELLERİ — gerçek ekranların birebir mockup'ı (telifsiz, SVG).
// iOS Safari ve Android Chrome'da "ana ekrana ekle" adımlarını, doğru düğme
// şekilleri + vurgu + ok ile gösterir. TelefonaKurKocu içinde tarayıcıya göre
// ilgili görsel basılır.

// — iOS Safari: 1) alt çubuktaki Paylaş ikonu, 2) "Ana Ekrana Ekle" satırı —
export function IosKurulumGorsel() {
  return (
    <svg viewBox="0 0 280 300" className="mx-auto w-full max-w-[260px]" role="img" aria-label="iOS Safari kurulum adımları">
      {/* ADIM 1 — telefon alt çubuğu, Paylaş vurgulu */}
      <g>
        <rect x="14" y="8" width="252" height="116" rx="16" fill="#0b1726" stroke="#22344a" />
        {/* URL pill */}
        <rect x="34" y="22" width="212" height="20" rx="10" fill="#16263b" />
        <text x="140" y="36" textAnchor="middle" fill="#8aa0b6" fontSize="10" fontFamily="monospace">ayna.oneteamglobal.ai</text>
        {/* içerik silüeti */}
        <rect x="34" y="50" width="150" height="6" rx="3" fill="#1c2f47" />
        <rect x="34" y="60" width="120" height="6" rx="3" fill="#1c2f47" />
        {/* Safari alt araç çubuğu */}
        <line x1="14" y1="92" x2="266" y2="92" stroke="#22344a" />
        <text x="44" y="112" textAnchor="middle" fontSize="16" fill="#64768c">‹</text>
        <text x="84" y="112" textAnchor="middle" fontSize="16" fill="#64768c">›</text>
        {/* Paylaş ikonu (kare + yukarı ok) — vurgulu */}
        <circle cx="140" cy="106" r="17" fill="#d4af37" opacity="0.16" />
        <circle cx="140" cy="106" r="17" fill="none" stroke="#d4af37" strokeWidth="1.6">
          <animate attributeName="r" values="15;18;15" dur="1.6s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="1;0.4;1" dur="1.6s" repeatCount="indefinite" />
        </circle>
        <g stroke="#ffd877" strokeWidth="1.7" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M140 99v10M140 99l-3.2 3.2M140 99l3.2 3.2" />
          <path d="M134 105h-2.4a1.6 1.6 0 0 0-1.6 1.6v5.4a1.6 1.6 0 0 0 1.6 1.6h16.8a1.6 1.6 0 0 0 1.6-1.6v-5.4a1.6 1.6 0 0 0-1.6-1.6H146" />
        </g>
        <text x="196" y="112" textAnchor="middle" fontSize="15" fill="#64768c">⧉</text>
      </g>
      {/* 1 rozeti + etiket */}
      <g>
        <circle cx="24" cy="106" r="9" fill="#d4af37" />
        <text x="24" y="110" textAnchor="middle" fill="#1a1206" fontSize="11" fontWeight="bold">1</text>
      </g>

      {/* bağlantı oku */}
      <path d="M140 128v14" stroke="#d4af37" strokeWidth="1.6" fill="none" />
      <path d="M140 144l-4-5h8z" fill="#d4af37" />

      {/* ADIM 2 — paylaş menüsü, "Ana Ekrana Ekle" vurgulu */}
      <g>
        <rect x="34" y="150" width="212" height="140" rx="14" fill="#0e1c2e" stroke="#22344a" />
        <rect x="48" y="164" width="90" height="7" rx="3.5" fill="#273a52" />
        {/* sıradan satırlar */}
        <rect x="48" y="184" width="184" height="22" rx="8" fill="#16263b" />
        <text x="58" y="199" fill="#7c8ea4" fontSize="11">Kopyala</text>
        {/* vurgulu satır */}
        <rect x="44" y="212" width="192" height="30" rx="9" fill="#d4af37" opacity="0.14" />
        <rect x="44" y="212" width="192" height="30" rx="9" fill="none" stroke="#d4af37" strokeWidth="1.4" />
        {/* ⊞ ikon */}
        <rect x="54" y="220" width="14" height="14" rx="3" fill="none" stroke="#ffd877" strokeWidth="1.6" />
        <path d="M61 223.5v7M57.5 227h7" stroke="#ffd877" strokeWidth="1.6" strokeLinecap="round" />
        <text x="78" y="231.5" fill="#ffe6a3" fontSize="12" fontWeight="bold">Ana Ekrana Ekle</text>
        <rect x="48" y="250" width="184" height="22" rx="8" fill="#16263b" />
        <text x="58" y="265" fill="#7c8ea4" fontSize="11">Yer İşareti Ekle</text>
      </g>
      <g>
        <circle cx="24" cy="227" r="9" fill="#d4af37" />
        <text x="24" y="231" textAnchor="middle" fill="#1a1206" fontSize="11" fontWeight="bold">2</text>
      </g>
    </svg>
  );
}

// — Android Chrome: ⋮ menüsü → "Uygulamayı yükle" —
export function AndroidKurulumGorsel() {
  return (
    <svg viewBox="0 0 280 230" className="mx-auto w-full max-w-[260px]" role="img" aria-label="Android Chrome kurulum adımları">
      {/* telefon üst çubuğu, ⋮ vurgulu */}
      <g>
        <rect x="14" y="8" width="252" height="70" rx="16" fill="#0b1726" stroke="#22344a" />
        <rect x="30" y="24" width="190" height="22" rx="11" fill="#16263b" />
        <text x="44" y="39" fill="#8aa0b6" fontSize="10" fontFamily="monospace">ayna.oneteamglobal.ai</text>
        {/* ⋮ menü — vurgulu */}
        <circle cx="240" cy="35" r="15" fill="#d4af37" opacity="0.16" />
        <circle cx="240" cy="35" r="15" fill="none" stroke="#d4af37" strokeWidth="1.6">
          <animate attributeName="r" values="13;16;13" dur="1.6s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="1;0.4;1" dur="1.6s" repeatCount="indefinite" />
        </circle>
        <g fill="#ffd877">
          <circle cx="240" cy="29" r="1.7" />
          <circle cx="240" cy="35" r="1.7" />
          <circle cx="240" cy="41" r="1.7" />
        </g>
      </g>
      <g>
        <circle cx="24" cy="35" r="9" fill="#d4af37" />
        <text x="24" y="39" textAnchor="middle" fill="#1a1206" fontSize="11" fontWeight="bold">1</text>
      </g>

      {/* bağlantı oku */}
      <path d="M240 80v10" stroke="#d4af37" strokeWidth="1.6" fill="none" />
      <path d="M240 92l-4-5h8z" fill="#d4af37" />

      {/* açılan menü, "Uygulamayı yükle" vurgulu */}
      <g>
        <rect x="120" y="98" width="146" height="120" rx="12" fill="#0e1c2e" stroke="#22344a" />
        <rect x="134" y="112" width="118" height="18" rx="7" fill="#16263b" />
        <text x="144" y="125" fill="#7c8ea4" fontSize="10">Yeni sekme</text>
        {/* vurgulu satır */}
        <rect x="128" y="136" width="130" height="28" rx="8" fill="#d4af37" opacity="0.14" />
        <rect x="128" y="136" width="130" height="28" rx="8" fill="none" stroke="#d4af37" strokeWidth="1.4" />
        {/* indir ikon */}
        <g stroke="#ffd877" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M141 143v9M141 152l-3-3M141 152l3-3" />
          <path d="M136 157h10" />
        </g>
        <text x="152" y="154" fill="#ffe6a3" fontSize="10.5" fontWeight="bold">Uygulamayı yükle</text>
        <rect x="134" y="172" width="118" height="18" rx="7" fill="#16263b" />
        <text x="144" y="185" fill="#7c8ea4" fontSize="10">Geçmiş</text>
        <rect x="134" y="194" width="90" height="16" rx="7" fill="#16263b" />
      </g>
      <g>
        <circle cx="104" cy="150" r="9" fill="#d4af37" />
        <text x="104" y="154" textAnchor="middle" fill="#1a1206" fontSize="11" fontWeight="bold">2</text>
      </g>
    </svg>
  );
}
