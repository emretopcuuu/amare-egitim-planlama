// TR ana OG görseli (1200×630): porselen zemin + kimlik satırı + slogan +
// dairesel duotone portre. Alt yazı değişince yeniden üretilir.
import sharp from "sharp";

const ALT = "ONETEAM KURUCU ORTAĞI · 4 KITADA 200.000+";

const zemin = `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="630" fill="#f1efe9"/>
  <text x="84" y="140" font-family="DejaVu Serif, Georgia, serif" font-size="26" letter-spacing="10" fill="#9a7a2c">EMRE TOPÇU</text>
  <text x="84" y="182" font-family="DejaVu Sans, sans-serif" font-size="19" letter-spacing="2" fill="#67645d">${ALT}</text>
  <text x="80" y="322" font-family="DejaVu Serif, Georgia, serif" font-weight="bold" font-size="72" fill="#1a1a1d">Ekleme değil,</text>
  <text x="80" y="424" font-family="DejaVu Serif, Georgia, serif" font-weight="bold" font-size="72" fill="#9a7a2c">katlama.</text>
  <rect x="84" y="496" width="120" height="5" fill="#9a7a2c"/>
  <text x="84" y="560" font-family="DejaVu Sans, sans-serif" font-size="26" fill="#67645d">emretopcu.ai</text>
</svg>`;

const CAP = 470;
const maske = Buffer.from(
  `<svg width="${CAP}" height="${CAP}"><circle cx="${CAP / 2}" cy="${CAP / 2}" r="${CAP / 2}" fill="#fff"/></svg>`,
);
const portre = await sharp("public/portre-duotone.webp")
  .resize(CAP, CAP, { fit: "cover", position: "attention" })
  .composite([{ input: maske, blend: "dest-in" }])
  .png()
  .toBuffer();

await sharp(Buffer.from(zemin))
  .composite([{ input: portre, left: 1200 - CAP - 65, top: (630 - CAP) / 2 }])
  .png()
  .toFile("public/og.png");
console.log("og.png üretildi");
