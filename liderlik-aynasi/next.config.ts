import type { NextConfig } from "next";

// Faz 0 (ölçek göçü): self-host (Railway/Docker) için yalın Node sunucusu çıktısı.
// Vercel ve Netlify bunu kendi pipeline'larıyla yönetir; orada standalone/izleme
// kökü ayarı build'i bozabiliyor — bu yüzden yalnız self-host build'inde aç.
const selfHost = !process.env.VERCEL && !process.env.NETLIFY;

// Güvenlik başlıkları — tüm yollara uygulanır. ayna Railway'de barındığı için
// Cloudflare'in otomatik başlıkları buraya GELMEZ; başlıkları Next sunucusu
// kendisi eklemek zorunda. 5 başlık ENFORCED (hepsi dış denetimle doğrulandı,
// mikrofon+kamera bilinçle AÇIK çünkü ses ritüeli/Canlı Ayna kullanıyor).
// CSP yalnızca REPORT-ONLY: hiçbir şeyi engellemez, yalnız ihlalleri loglar —
// three.js/MediaRecorder/inline script'leri canlıda kırmadan enforce verisi toplar.
async function guvenlikBasliklari() {
  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'self'",
    "img-src 'self' data: blob:",
    "media-src 'self' blob: data:",
    "font-src 'self' data:",
    "style-src 'self' 'unsafe-inline'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "connect-src 'self' https://monitor.oneteamglobal.ai https://swxfxeuxlriuoecjxdla.supabase.co",
    "worker-src 'self' blob:",
    "form-action 'self'",
  ].join("; ");

  return [
    {
      source: "/:path*",
      headers: [
        { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        { key: "X-Frame-Options", value: "SAMEORIGIN" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=(), browsing-topics=()" },
        { key: "Content-Security-Policy-Report-Only", value: csp },
      ],
    },
  ];
}

const nextConfig: NextConfig = selfHost
  ? {
      output: "standalone",
      // Depo kökündeki ikinci package.json (eski Vite app) yüzünden Next izleme
      // kökünü repo köküne alıp çıktıyı iç içe koyuyordu; uygulama dizinine sabitle.
      outputFileTracingRoot: process.cwd(),
      headers: guvenlikBasliklari,
    }
  : {
      headers: guvenlikBasliklari,
    };

export default nextConfig;
