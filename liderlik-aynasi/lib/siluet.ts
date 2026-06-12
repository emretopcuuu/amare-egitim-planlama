import "server-only";
import sharp from "sharp";

// Fotoğraf → hayalet silüet. Detay silinir, duruş kalır: ağır bulanıklık +
// gri ton + kenarlara eriyen oval maske. Yüz tanınmaz — suda "kendini
// görmeye çalışmak" hissi için belirsiz bir iz yeterlidir; netlik büyüyü bozar.
const EN = 256;
const BOY = 320;

const MASKE = Buffer.from(
  `<svg width="${EN}" height="${BOY}" xmlns="http://www.w3.org/2000/svg">
     <defs>
       <radialGradient id="g" cx="50%" cy="42%" r="60%">
         <stop offset="45%" stop-color="#ffffff" stop-opacity="1"/>
         <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
       </radialGradient>
     </defs>
     <rect width="100%" height="100%" fill="url(#g)"/>
   </svg>`
);

export async function hayaletSiluet(girdi: Buffer): Promise<Buffer> {
  return sharp(girdi)
    .rotate() // EXIF yönünü düzelt (telefon kameraları)
    .resize(EN, BOY, { fit: "cover" })
    .greyscale()
    .normalise()
    .blur(3)
    .ensureAlpha()
    .composite([{ input: MASKE, blend: "dest-in" }])
    .png()
    .toBuffer();
}
