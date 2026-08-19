// YouTube kapaklarını yerelleştirir (public/kapak/<id>.jpg): dış bağlantı
// yavaşsa/koparsa site kırık kart göstermez. Haftalık Action da çalıştırır.
import { mkdir, readFile, writeFile } from "node:fs/promises";

const idler = new Set();
const populer = await readFile("lib/populer.ts", "utf8");
for (const e of populer.matchAll(/id: "([^"]+)"/g)) idler.add(e[1]);
const icerik = await readFile("lib/icerik.ts", "utf8");
const tribute = icerik.match(/TRIBUTE_VIDEO_ID = "([^"]+)"/);
if (tribute) idler.add(tribute[1]);
try {
  const son = JSON.parse(await readFile("public/son-video.json", "utf8"));
  if (son?.id) idler.add(son.id);
} catch {
  /* yoksa geç */
}

await mkdir("public/kapak", { recursive: true });
for (const id of idler) {
  try {
    const r = await fetch(`https://i.ytimg.com/vi/${id}/hqdefault.jpg`);
    if (!r.ok) {
      console.log(`atlandı ${id}: ${r.status}`);
      continue;
    }
    await writeFile(`public/kapak/${id}.jpg`, Buffer.from(await r.arrayBuffer()));
    console.log(`kapak/${id}.jpg`);
  } catch (h) {
    console.log(`atlandı ${id}: ${h?.message ?? h}`);
  }
}
