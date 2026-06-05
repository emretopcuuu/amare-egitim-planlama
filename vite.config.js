import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { sentryVitePlugin } from '@sentry/vite-plugin'

// Sentry source map upload — sadece auth token + org + project varsa devreye girer.
// Yoksa plugin no-op çalışır, build kırılmaz.
const sentryPlugins = (process.env.SENTRY_AUTH_TOKEN && process.env.SENTRY_ORG && process.env.SENTRY_PROJECT)
  ? [sentryVitePlugin({
      authToken: process.env.SENTRY_AUTH_TOKEN,
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      release: { name: process.env.COMMIT_REF?.slice(0, 7) || 'dev' },
      telemetry: false,
    })]
  : []

export default defineConfig({
  plugins: [react(), ...sentryPlugins],
  build: {
    outDir: 'dist',
    sourcemap: sentryPlugins.length > 0, // Sentry varsa source map üret + upload et
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Code splitting — vendor + büyük kütüphaneleri ayır
        // İlk yüklemede sadece çekirdek kod indirilir, kullanıcı detaya gittikçe diğer chunk'lar yüklenir
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // React core — her sayfada gerekli
            if (id.includes('react/') || id.includes('react-dom') || id.includes('react-router')) {
              return 'react-vendor';
            }
            // Firebase — sayfa açılışında gerekli
            if (id.includes('firebase')) {
              return 'firebase-vendor';
            }
            // PDF kütüphaneleri — sadece admin & PDF indir
            if (id.includes('jspdf') || id.includes('html2canvas') || id.includes('canvg') || id.includes('dompurify')) {
              return 'pdf-vendor';
            }
            // Excel kütüphanesi — sadece admin Excel import/export
            if (id.includes('xlsx')) {
              return 'xlsx-vendor';
            }
            // QRCode — sadece admin QR feature
            if (id.includes('qrcode')) {
              return 'qr-vendor';
            }
            // Lucide icons — birleşik
            if (id.includes('lucide-react')) {
              return 'icons-vendor';
            }
            // Confetti — küçük, kalsın
            // Diğer vendor
            return 'vendor';
          }
        },
      },
    },
  },
})
