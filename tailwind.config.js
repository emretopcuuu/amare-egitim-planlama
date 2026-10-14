/** @type {import('tailwindcss').Config} */

// ── ORTAK AKIL PALETİ (Eki 2026) ──
// Yönetim Kurulu Ortak Akıl Platformu'ndan (yonetimkurulu.oneteamglobal.ai)
// ölçülen renkler: siyah/koyu petrol + şampanya altını. Takvim ve ana sayfalar
// o dile taşındı. Kodda yüzlerce `purple-*` / `amber-*` sınıfı var; sınıfları
// tek tek değiştirmek yerine RAMPALARI yeniden tanımlıyoruz, böylece yapı
// hiç bozulmadan renk dönüyor ve geri almak tek dosya.
//
// Ortak Akıl'dan ölçülen çapa değerler:
//   #12303B birincil koyu petrol · #174656 vurgu · #5D7883 ikincil
//   #A88A3F ana altın · #E4D19B açık altın · #F4E6B8 çok açık altın
const petrol = {
  50:  '#F2F6F8',
  100: '#E3EBEF',
  200: '#C6D5DC',
  300: '#A3BAC4',
  400: '#7E9BA8',
  500: '#5D7883',   // Ortak Akıl ikincil metin
  600: '#456170',
  700: '#2F4A58',
  800: '#1E3A47',
  900: '#12303B',   // Ortak Akıl birincil koyu
  950: '#0B1F27',
};

// indigo, kodda purple ile birlikte gradyanlarda geçiyor; bir ton daha derin.
const petrolDerin = {
  50:  '#EFF4F7', 100: '#DDE7EC', 200: '#BCCCD6', 300: '#94AEBC',
  400: '#6E8EA0', 500: '#4F7083', 600: '#3B5668', 700: '#2A3F4E',
  800: '#1A2C38', 900: '#102029', 950: '#07151B',
};

const sampanya = {
  50:  '#FBF7EA',
  100: '#F4E6B8',   // Ortak Akıl çok açık altın
  200: '#E4D19B',   // Ortak Akıl açık altın
  300: '#D4BC7B',
  400: '#C4A65C',
  500: '#A88A3F',   // Ortak Akıl ana altın
  600: '#8C7132',
  700: '#705827',
  800: '#54421D',
  900: '#3A2D14',
  950: '#231B0C',
};

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        purple: petrol,
        violet: petrol,
        fuchsia: sampanya,
        indigo: petrolDerin,
        amber: sampanya,
        yellow: sampanya,
        amare: {
          purple: '#174656',
          blue: '#2F6B85',
          light: '#5D7883',
          dark: '#12303B',
        },
        // Sayfa zemini — tek yerden
        zemin: {
          DEFAULT: '#0E2630',
          koyu: '#09191F',
          yuzey: '#12303B',
        },
      }
    },
  },
  plugins: [],
}
