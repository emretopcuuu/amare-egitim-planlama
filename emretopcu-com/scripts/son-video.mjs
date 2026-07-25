// En yeni YouTube videosunu çeker, public/son-video.json'a yazar.
// Bağımlılık yok; başarısız olursa dosyayı değiştirmeden 0 ile çıkar.
import { readFileSync, writeFileSync } from "node:fs";

const KANAL = "https://www.youtube.com/@emretopcuofficial";
const HEDEF = "public/son-video.json";

function coz(metin, re) {
  const m = metin.match(re);
  return m ? m[1] : null;
}

try {
  const sayfa = await fetch(KANAL, {
    headers: { "user-agent": "Mozilla/5.0 (compatible; emretopcu-bot)" },
  }).then((r) => r.text());
  const kanalId =
    coz(sayfa, /"externalId":"(UC[\w-]+)"/) ||
    coz(sayfa, /"channelId":"(UC[\w-]+)"/) ||
    coz(sayfa, /channel\/(UC[\w-]+)/);
  if (!kanalId) throw new Error("kanal id bulunamadı");

  const rss = await fetch(
    `https://www.youtube.com/feeds/videos.xml?channel_id=${kanalId}`,
  ).then((r) => r.text());
  const entry = rss.split("<entry>")[1] || "";
  const id = coz(entry, /<yt:videoId>([\w-]+)<\/yt:videoId>/);
  let baslik = coz(entry, /<title>([^<]+)<\/title>/) || "";
  baslik = baslik
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .trim();
  if (!id) throw new Error("video id bulunamadı");

  const mevcut = JSON.parse(readFileSync(HEDEF, "utf8"));
  if (mevcut.id === id) {
    console.log("değişiklik yok:", id);
    process.exit(0);
  }
  writeFileSync(HEDEF, JSON.stringify({ id, baslik }, null, 2) + "\n");
  console.log("güncellendi:", id, baslik);
} catch (e) {
  console.error("son-video atlandı:", e.message);
  process.exit(0);
}
