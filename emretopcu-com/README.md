# emretopcu.com

Emre Topçu'nun kişisel marka sitesi. Tek sayfa, Türkçe, koyu tema.

- **Stack:** Next.js 16 (App Router) + TypeScript + Tailwind v4
- **Konum:** Repo içinde bağımsız proje, `emretopcu-com/` klasörü
  (liderlik-aynasi ile aynı desen; repo kökündeki eski uygulamaya dokunmaz)

## Geliştirme

```bash
cd emretopcu-com
npm install
npm run dev        # http://localhost:3000
npx tsc --noEmit   # tip kontrolü
npm run build      # production build
```

## Yayına alma (Netlify)

1. Netlify'da **yeni site** oluştur: "Import from Git" ile bu repoyu seç.
2. **Base directory:** `emretopcu-com` (build komutu ve publish klasörü
   `netlify.toml`'dan otomatik gelir).
3. Site açıldıktan sonra **Domain settings > Add custom domain** ile
   `emretopcu.com` ekle; domain sağlayıcında Netlify'ın verdiği DNS
   kayıtlarını (veya Netlify DNS'i) tanımla. SSL otomatik.

## Yapılacaklar (içerik)

- [ ] `public/portre.jpg` (1200x1500): gerçek portre fotoğrafı ekle ve
      `app/page.tsx` içindeki hero monogram panelini `next/image` ile değiştir
      (TODO yorumu mevcut).
- [ ] Instagram linkini doğrula (`app/page.tsx`, Iletisim bölümündeki TODO).
- [ ] İletişim e-postasını istersen `iletisim@emretopcu.com` gibi bir domain
      adresiyle değiştir (`EPOSTA` sabiti, `app/page.tsx`).
- [ ] Hakkımda ve Yolculuk metinlerini kendi ağzından geç; taslak metinler
      repo verilerinden (gerçek eğitim başlıkları, kamp bilgileri) derlendi.
