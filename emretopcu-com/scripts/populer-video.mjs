// En çok izlenen ilk 6 YouTube videosunu çeker, lib/populer.ts'i tazeler.
// Bağımlılık yok; başarısız olursa dosyayı değiştirmeden 0 ile çıkar.
import { readFileSync, writeFileSync } from "node:fs";

const URL =
  "https://www.youtube.com/@emretopcuofficial/videos?view=0&sort=p";
const HEDEF = "lib/populer.ts";

try {
  const html = await fetch(URL, {
    headers: { "user-agent": "Mozilla/5.0", "accept-language": "tr" },
  }).then((r) => r.text());
  const re = /"videoId":"([\w-]{11})"/g;
  const gorulen = new Set();
  const ids = [];
  let m;
  while ((m = re.exec(html))) {
    if (!gorulen.has(m[1])) {
      gorulen.add(m[1]);
      ids.push(m[1]);
    }
  }
  const top = ids.slice(0, 6);
  if (top.length < 3) throw new Error("yeterli video yok");

  const videolar = [];
  for (const id of top) {
    const o = await fetch(
      `https://www.youtube.com/oembed?url=https://youtu.be/${id}&format=json`,
    )
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);
    const baslik = (o?.title || "").replace(/"/g, '\\"');
    if (baslik) videolar.push({ id, baslik });
  }
  if (videolar.length < 3) throw new Error("başlıklar alınamadı");

  const satirlar = videolar
    .map((v) => `  { id: "${v.id}", baslik: "${v.baslik}" },`)
    .join("\n");
  const eski = readFileSync(HEDEF, "utf8");
  const yeni = eski.replace(
    /export const POPULER: PopulerVideo\[\] = \[[\s\S]*?\];/,
    `export const POPULER: PopulerVideo[] = [\n${satirlar}\n];`,
  );
  if (yeni === eski) {
    console.log("değişiklik yok");
    process.exit(0);
  }
  writeFileSync(HEDEF, yeni);
  console.log("populer.ts güncellendi:", videolar.map((v) => v.baslik).join(", "));
} catch (e) {
  console.error("populer atlandı:", e.message);
  process.exit(0);
}
