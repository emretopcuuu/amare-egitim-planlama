import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
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
