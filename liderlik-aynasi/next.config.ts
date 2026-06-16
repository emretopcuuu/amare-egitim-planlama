import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Faz 0 (ölçek göçü): self-host için yalın Node sunucusu çıktısı.
  // Vercel bunu yok sayar, Netlify plugin'i uyumludur; Railway/Docker için şarttır.
  output: "standalone",
  // Depo kökünde ikinci bir package.json (eski Vite app) olduğundan Next izleme
  // kökünü repo köküne alıp çıktıyı iç içe koyuyordu; uygulama dizinine sabitle.
  // (next build her zaman uygulama dizininden çalışır → cwd = uygulama kökü.)
  outputFileTracingRoot: process.cwd(),
};

export default nextConfig;
