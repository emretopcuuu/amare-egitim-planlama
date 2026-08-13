// Dil başına OG görseli (1200×630): porselen zemin + altın çerçeve + slogan.
// Bir kez üretilir, public/'e commit edilir. TR ana og.png'ye dokunmaz.
import sharp from "sharp";

const DILLER = [
  { kod: "en", s1: "Not adding.", s2: "Multiplying." },
  { kod: "de", s1: "Nicht addieren,", s2: "multiplizieren." },
  { kod: "es", s1: "No sumar,", s2: "multiplicar." },
  { kod: "ru", s1: "Не сложение,", s2: "а умножение." },
  { kod: "az", s1: "Əlavə etmə deyil,", s2: "qatlama." },
];

const esc = (t) =>
  t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

for (const d of DILLER) {
  const svg = `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="630" fill="#f1efe9"/>
  <rect x="36" y="36" width="1128" height="558" fill="none" stroke="#9a7a2c" stroke-opacity="0.45" stroke-width="2"/>
  <text x="96" y="150" font-family="DejaVu Serif, Georgia, serif" font-size="26" letter-spacing="10" fill="#9a7a2c">EMRE TOPÇU</text>
  <text x="92" y="320" font-family="DejaVu Sans, sans-serif" font-weight="bold" font-size="84" fill="#1a1a1d">${esc(d.s1)}</text>
  <text x="92" y="420" font-family="DejaVu Sans, sans-serif" font-weight="bold" font-size="84" fill="#9a7a2c">${esc(d.s2)}</text>
  <text x="96" y="540" font-family="DejaVu Sans, sans-serif" font-size="28" fill="#67645d">Presidential Diamond | One Team Global</text>
  <text x="936" y="540" font-family="DejaVu Serif, Georgia, serif" font-size="28" fill="#9a7a2c">emretopcu.ai</text>
</svg>`;
  await sharp(Buffer.from(svg)).png().toFile(`public/og-${d.kod}.png`);
  console.log(`og-${d.kod}.png üretildi`);
}
