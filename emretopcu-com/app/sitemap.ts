import type { MetadataRoute } from "next";

export const dynamic = "force-static";

const TABAN = "https://emretopcu.ai";

// Statik export'ta sitemap.xml derleme anında üretilir.
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date("2026-07-18");
  const yollar = ["", "/en", "/medya", "/dusunuyorum"];
  return yollar.map((y) => ({
    url: `${TABAN}${y}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: y === "" ? 1 : 0.7,
  }));
}
