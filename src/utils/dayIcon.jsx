// Gün ikonu/motifi — her hafta günü için ince görsel iz
// Date objesi alır, görsel SVG inline döndürür (cheap, no icon library)
import React from 'react';

const DAY_MOTIFS = {
  // 0 = Pazar
  0: { color: 'rgba(245, 215, 122, 0.8)', motif: '☀' },     // Pazar — dinlence
  1: { color: 'rgba(167, 139, 250, 0.85)', motif: '◐' },    // Pazartesi — başlangıç
  2: { color: 'rgba(196, 181, 253, 0.85)', motif: '●' },    // Salı
  3: { color: 'rgba(216, 180, 254, 0.85)', motif: '◆' },    // Çarşamba
  4: { color: 'rgba(232, 121, 249, 0.85)', motif: '▲' },    // Perşembe
  5: { color: 'rgba(245, 215, 122, 0.95)', motif: '★' },    // Cuma — hafta sonu yaklaşıyor
  6: { color: 'rgba(245, 215, 122, 0.7)', motif: '◍' },    // Cumartesi
};

export const getDayMotif = (date) => {
  if (!date) return DAY_MOTIFS[1];
  return DAY_MOTIFS[date.getDay()] || DAY_MOTIFS[1];
};

// Inline SVG day motif — küçük dekoratif sembol
export const DayMotif = ({ date, className = 'w-3 h-3' }) => {
  const m = getDayMotif(date);
  return (
    <span className={`inline-flex items-center justify-center ${className}`} style={{ color: m.color }} aria-hidden="true">
      {m.motif}
    </span>
  );
};
