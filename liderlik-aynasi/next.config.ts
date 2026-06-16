import type { NextConfig } from "next";

// Faz 0 (ölçek göçü): self-host (Railway/Docker) için yalın Node sunucusu çıktısı.
// Vercel ve Netlify bunu kendi pipeline'larıyla yönetir; orada standalone/izleme
// kökü ayarı build'i bozabiliyor — bu yüzden yalnız self-host build'inde aç.
const selfHost = !process.env.VERCEL && !process.env.NETLIFY;

const nextConfig: NextConfig = selfHost
  ? {
      output: "standalone",
      // Depo kökündeki ikinci package.json (eski Vite app) yüzünden Next izleme
      // kökünü repo köküne alıp çıktıyı iç içe koyuyordu; uygulama dizinine sabitle.
      outputFileTracingRoot: process.cwd(),
    }
  : {};

export default nextConfig;
