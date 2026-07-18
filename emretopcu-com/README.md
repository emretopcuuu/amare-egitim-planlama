# emretopcu.ai

Emre Topçu'nun kişisel marka sitesi. Tek sayfa, Türkçe, sinematik 3D
"video scroll" deneyimi (sayfa boyu WebGL sahnesi: pırlanta + altın
parçacık alanı; scroll kamerayı sahneye daldırır).

- **Stack:** Next.js 16 (App Router) + TypeScript + Tailwind v4 +
  Motion (`motion/react`) + three.js / React Three Fiber
- **Çıktı:** Statik (`output: "export"` → `out/`)
- **Yayın:** Cloudflare Pages (domain: `emretopcu.ai`, Cloudflare Registrar'da)
- **Konum:** Repo içinde bağımsız proje, `emretopcu-com/` klasörü
  (liderlik-aynasi ile aynı desen; repo kökündeki eski uygulamaya dokunmaz)

## Geliştirme

```bash
cd emretopcu-com
npm install
npm run dev        # http://localhost:3000
npx tsc --noEmit   # tip kontrolü
npm run build      # statik çıktı: out/
```

## Yayına alma (Cloudflare Pages)

```bash
cd emretopcu-com
npm run build
CLOUDFLARE_API_TOKEN=... npx wrangler pages deploy out --project-name=emretopcu-ai
```

- Token izinleri: Account > Cloudflare Pages: Edit, Zone > DNS: Edit,
  Zone > Zone: Read.
- Custom domain (`emretopcu.ai` + `www`) Pages projesine bir kez bağlanır;
  zone aynı hesapta olduğundan DNS ve SSL otomatik yönetilir.

## Yapılacaklar (içerik)

- [ ] Portre fotoğrafı: kullanıcıdan gelince hero/hakkımda bölümüne
      `next/image` ile eklenecek.
- [ ] İletişim e-postası istenirse `iletisim@emretopcu.ai` gibi bir domain
      adresine taşınabilir (`EPOSTA` sabiti, `lib/icerik.ts`).
- [ ] **Ziyaretçi analitiği:** Cloudflare Pages panelinde `emretopcu-ai`
      projesi > **Web Analytics**'i aç (kod gerekmez, çerezsiz). WhatsApp
      CTA'ları zaten hangi bölümden gelindiğini mesaja `[bölüm]` etiketiyle
      ekliyor (`whatsappUrl`, `lib/icerik.ts`) — hangi içeriğin ikna ettiğini
      mesajlardan görebilirsin.
- [ ] **Bülten/kitap ilgi listesi:** şimdilik backend'siz (Pazartesi Notları
      e-posta ile, kitap "haber ver" WhatsApp ile). Kalıcı liste istenirse
      Formspree/Buttondown gibi bir servise bağlanır (`bultenMailto`,
      `kitapHaberUrl`, `lib/icerik.ts`).

## Sayfalar

- `/` (TR) ve `/en` (EN): tek sayfa sinematik deneyim (`components/varyantlar/Zirve.tsx`).
- `/medya`: medya kiti (portreler, 3 uzunlukta bio, konuşma başlıkları, davet).
- `/dusunuyorum`: 3 soruluk karar testi (`components/KararTesti.tsx`).
- `/sitemap.xml`, `/robots.txt`, `/llms.txt`: SEO + AI görünürlüğü.

## Tema

Gündüz (porselen) / gece (mürekkep laciverti) teması `lib/tema.ts` ile
yönetilir; `<html data-tema>` üzerinden. FOUC olmasın diye ilk değeri
`app/layout.tsx`'teki satır-içi script boyar (21:00–07:00 arası varsayılan
gece). Ag3D ve Dünya küresi renklerini temaya göre günceller.
