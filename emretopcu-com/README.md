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

- `/` (TR), `/en`, `/ru`, `/az`: tek sayfa sinematik deneyim (`components/varyantlar/Zirve.tsx`).
  Çeviriler `lib/icerik.ts` (TR/EN) + `lib/icerikRu.ts` + `lib/icerikAz.ts`.
- `/medya`: medya kiti (portreler, 3 uzunlukta bio, konuşma başlıkları, davet).
- `/dusunuyorum`: 3 soruluk karar testi (cevaba göre öndolu WhatsApp).
- `/plan`: yazdırılabilir "İlk 72 Saat" başlangıç planı (lead magnet).
- `/salon`: sahne için tam ekran döngü (söz + WhatsApp QR); `robots: noindex`.
- `/soz/<slug>`: söze özel sayfa + kendi OG kartı (`public/soz/<slug>.png`,
  `scripts/og-soz.mjs` ile `prebuild`'de üretilir).
- `/sitemap.xml`, `/robots.txt`, `/llms.txt`: SEO + AI görünürlüğü (JSON-LD:
  Person/Book/FAQ/VideoObject + speakable).

## Cloudflare Pages Functions (opsiyonel arka uç)

`functions/api/` altında iki uç nokta; bağlamalar yoksa güvenle devre dışı kalır
(site bozulmaz — istemci mailto/statik yedeğe düşer):

- `POST /api/olay` — çerezsiz olay sayacı. **KV binding `OLAY_KV`** bağlanınca
  günlük olay sayaçları tutulur (kişisel veri yok). İstemci: `lib/olcum.ts`.
- `POST /api/bulten` — Pazartesi Notları kaydı. **KV `BULTEN_KV`** + **env
  `TURNSTILE_SECRET`** gerekir; yoksa 501 döner, form mailto'ya düşer.
  Turnstile site anahtarını de eklersen tam çalışır.

KV + Turnstile'ı Cloudflare Pages panelinden (Settings → Functions →
KV namespace bindings / Environment variables) bağla.

## Otomasyon (GitHub Actions)

- `.github/workflows/emretopcu-haftalik.yml` — her Pazartesi YouTube RSS'ten en
  yeni videoyu çeker (`scripts/son-video.mjs` → `public/son-video.json`),
  değiştiyse yeniden derleyip deploy eder. **Secret `CLOUDFLARE_API_TOKEN`**
  gerekir (yoksa yalnız json commit'lenir, deploy atlanır).
- `.github/workflows/emretopcu-lighthouse.yml` — her PR'da Lighthouse bütçesi
  (uyarır, bloklamaz; `lighthouserc.json`).

## Tema

Gündüz (porselen) / gece (mürekkep laciverti) teması `lib/tema.ts` ile
yönetilir; `<html data-tema>` üzerinden. FOUC olmasın diye ilk değeri
`app/layout.tsx`'teki satır-içi script boyar (21:00–07:00 arası varsayılan
gece). Ag3D ve Dünya küresi renklerini temaya göre günceller.
