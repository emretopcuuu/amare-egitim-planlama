// GÖREV GÖRSEL KİMLİĞİ — her görev türü kendi atmosferini taşır (ikon + aksan
// rengi + üst şerit gradyanı + halka). Tek kaynak: aktif kart, geçmiş ve
// rozetler buradan okur. Saf modül (server + client birlikte kullanır).

export type GorevAtmosfer = {
  ikon: string;
  /** tür rozeti arka + metin (bg + text) */
  rozet: string;
  /** kartın üst kenar şeridi (gradient) */
  serit: string;
  /** kart halkası (ring rengi) */
  halka: string;
  /** kart için çok hafif arka ton */
  arka: string;
};

const ALTIN: GorevAtmosfer = {
  ikon: "🤖",
  rozet: "bg-gold/20 text-gold-light",
  serit: "from-gold/60 via-gold/20 to-transparent",
  halka: "ring-gold/40",
  arka: "bg-gold/[0.04]",
};

export const GOREV_ATMOSFER: Record<string, GorevAtmosfer> = {
  gozlem: {
    ikon: "👁",
    rozet: "bg-royal/30 text-royal-light",
    serit: "from-royal-light/60 via-royal/20 to-transparent",
    halka: "ring-royal/40",
    arka: "bg-royal/[0.04]",
  },
  cesaret: {
    ikon: "🔥",
    rozet: "bg-orange-500/20 text-orange-300",
    serit: "from-orange-500/60 via-orange-500/20 to-transparent",
    halka: "ring-orange-400/40",
    arka: "bg-orange-500/[0.04]",
  },
  yansima: {
    ikon: "🌊",
    rozet: "bg-emerald-500/20 text-emerald-300",
    serit: "from-emerald-400/60 via-emerald-500/20 to-transparent",
    halka: "ring-emerald-400/40",
    arka: "bg-emerald-500/[0.04]",
  },
  gizli: {
    ikon: "🤫",
    rozet: "bg-fuchsia-500/20 text-fuchsia-300",
    serit: "from-fuchsia-500/60 via-fuchsia-500/20 to-transparent",
    halka: "ring-fuchsia-400/40",
    arka: "bg-fuchsia-500/[0.04]",
  },
  tahmin: {
    ikon: "🎲",
    rozet: "bg-sky-500/20 text-sky-300",
    serit: "from-sky-400/60 via-sky-500/20 to-transparent",
    halka: "ring-sky-400/40",
    arka: "bg-sky-500/[0.04]",
  },
  simulasyon: {
    ikon: "🎭",
    rozet: "bg-rose-500/20 text-rose-300",
    serit: "from-rose-500/60 via-rose-500/20 to-transparent",
    halka: "ring-rose-400/40",
    arka: "bg-rose-500/[0.04]",
  },
  bag: {
    ikon: "🤝",
    rozet: "bg-teal-500/20 text-teal-300",
    serit: "from-teal-400/60 via-teal-500/20 to-transparent",
    halka: "ring-teal-400/40",
    arka: "bg-teal-500/[0.04]",
  },
  mentorluk: {
    ikon: "🤝",
    rozet: "bg-gold/20 text-gold-light",
    serit: "from-gold/60 via-gold/20 to-transparent",
    halka: "ring-gold/40",
    arka: "bg-gold/[0.04]",
  },
  soz: { ...ALTIN, ikon: "🤝" },
  senkron: {
    ikon: "⏱",
    rozet: "bg-sky-500/20 text-sky-300",
    serit: "from-sky-400/60 via-sky-500/20 to-transparent",
    halka: "ring-sky-400/40",
    arka: "bg-sky-500/[0.04]",
  },
};

export function atmosferBul(kind: string): GorevAtmosfer {
  return GOREV_ATMOSFER[kind] ?? ALTIN;
}
