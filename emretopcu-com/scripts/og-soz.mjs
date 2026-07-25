import sharp from "sharp";
import { mkdirSync, writeFileSync } from "node:fs";

// Söze özel OG kartları (1200×630) — WhatsApp/Twitter paylaşımında görünür.
const SOZLER = [
  { slug: "karar", soz: "Kayıt olduğun gün değil, karar verdiğin gün başlarsın." },
  { slug: "lider", soz: "Sır, lider üretmektir." },
  { slug: "neden", soz: "Nedenin güçlüyse, nasılın önemi kalmaz." },
  { slug: "engel", soz: "Seni durduran, yine sensin." },
  { slug: "takip", soz: "İnsanlar sözlerini değil, seni takip eder." },
];

function esc(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function sar(s, n) {
  const kel = s.split(" ");
  const satir = [];
  let cur = "";
  for (const k of kel) {
    if ((cur + " " + k).trim().length > n) {
      satir.push(cur.trim());
      cur = k;
    } else cur += " " + k;
  }
  if (cur.trim()) satir.push(cur.trim());
  return satir;
}

mkdirSync("public/soz", { recursive: true });
for (const { slug, soz } of SOZLER) {
  const satirlar = sar(soz, 26);
  const bas = 315 - (satirlar.length - 1) * 33;
  const tspan = satirlar
    .map((l, i) => `<tspan x="600" y="${bas + i * 66}">${esc(l)}</tspan>`)
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <rect width="1200" height="630" fill="#f1efe9"/>
  <rect x="28" y="28" width="1144" height="574" fill="none" stroke="#9a7a2c" stroke-opacity="0.45" stroke-width="3"/>
  <text x="600" y="110" text-anchor="middle" font-family="Georgia, serif" font-size="26" font-weight="600" letter-spacing="8" fill="#9a7a2c">EMRE TOPÇU</text>
  <text text-anchor="middle" font-family="Georgia, serif" font-size="52" font-weight="600" fill="#1a1a1d">${tspan}</text>
  <text x="600" y="560" text-anchor="middle" font-family="Georgia, serif" font-size="28" font-weight="600" letter-spacing="2" fill="#9a7a2c">emretopcu.ai</text>
</svg>`;
  const out = `public/soz/${slug}.png`;
  await sharp(Buffer.from(svg)).png().toFile(out);
  console.log("yazıldı:", out);
}
