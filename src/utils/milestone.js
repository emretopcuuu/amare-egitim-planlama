// Milestone confetti tetikleyici — başarı anlarında
// canvas-confetti zaten dependency'de var

import confetti from 'canvas-confetti';

const TUS_ADILAR = {
  rank: ['#F5D77A', '#FBBF24', '#F59E0B', '#FFFFFF'],
  quiz: ['#A78BFA', '#7C3AED', '#FBBF24'],
  sertifika: ['#10B981', '#34D399', '#FBBF24'],
  streak: ['#F97316', '#FB923C', '#FBBF24'],
};

/**
 * @param {'rank'|'quiz'|'sertifika'|'streak'} tip
 */
export function kutla(tip = 'rank') {
  const renkler = TUS_ADILAR[tip] || TUS_ADILAR.rank;
  // Sol patlama
  confetti({
    particleCount: 60,
    angle: 60,
    spread: 70,
    origin: { x: 0, y: 0.6 },
    colors: renkler,
  });
  // Sağ patlama
  confetti({
    particleCount: 60,
    angle: 120,
    spread: 70,
    origin: { x: 1, y: 0.6 },
    colors: renkler,
  });
  // Orta patlama (büyük)
  setTimeout(() => {
    confetti({
      particleCount: 100,
      spread: 100,
      origin: { y: 0.4 },
      colors: renkler,
    });
  }, 200);
}

/**
 * Yeni rank'a ulaşıldığında çağır (rank takip sonrası)
 */
export function rankAtlandi() {
  kutla('rank');
}

/**
 * Quiz başarı %80+ sonrası
 */
export function quizBasarisi() {
  kutla('quiz');
}

/**
 * Streak milestone (7g, 30g, 100g)
 */
export function streakMilestone(gun) {
  if ([7, 30, 100, 365].includes(gun)) {
    kutla('streak');
  }
}
