import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cloudflare Pages'e statik yükleme: `next build` çıktısı out/ klasörüne düşer.
  output: "export",
  images: { unoptimized: true },
};

export default nextConfig;
