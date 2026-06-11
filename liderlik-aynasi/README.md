# Liderlik Aynası

3 günlük liderlik kampı için 360° liderlik değerlendirme uygulaması. Katılımcılar 10 liderlik özelliği üzerinden kendilerini ve atanan kişileri 3 dalga halinde puanlar; Gün 3 kapanışında herkes kişiye özel **Ayna Raporu** alır.

Bu klasör, deponun geri kalanından (Vite + Firebase eğitim takvimi uygulaması) **bağımsız** bir Next.js uygulamasıdır ve Vercel'e ayrı bir proje olarak deploy edilir.

## Teknoloji

- Next.js 16 (App Router) + TypeScript + Tailwind CSS v4
- Supabase Postgres (proje ref: `swxfxeuxlriuoecjxdla`, eu-central-1)
- Auth: 6 haneli giriş kodu → `jose` imzalı HTTP-only oturum çerezi (`la_oturum`). Supabase Auth kullanılmaz.
- Tüm veri erişimi sunucu katmanından `service_role` ile; tablolarda RLS açık ve **policy yok** (deny-all) — tarayıcıya giden anahtar hiçbir tabloyu okuyamaz.

## Kurulum

```bash
cd liderlik-aynasi
npm install
cp .env.example .env.local   # değerleri doldur
npm run dev
```

`.env.local` değerleri:

| Değişken | Nereden |
|---|---|
| `SUPABASE_URL` | `https://swxfxeuxlriuoecjxdla.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Project Settings → API Keys → `service_role` (veya yeni `sb_secret_...` anahtarı). **Asla istemciye sızdırma.** |
| `NEXT_PUBLIC_SUPABASE_URL` | Aynı proje URL'i (Faz 5 canlı ekran için) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Dashboard → API Keys → publishable key |
| `SESSION_SECRET` | `openssl rand -base64 32` |
| `ADMIN_PASSWORD` | Yönetici paneli şifresi |
| `ANTHROPIC_API_KEY` | platform.claude.com — AI Ayna Mektubu için (yoksa uygulama çalışır, yalnızca mektup üretimi kapalı kalır) |

## Veritabanı

Şema `supabase/migrations/` altında; canlı projeye uygulanmış durumda:

- `0001_initial_schema.sql` — participants, traits, waves, assignments, ratings, settings, login_attempts
- `0002_rls.sql` — deny-all RLS
- `0003_seed_core.sql` — 10 özellik, 3 dalga, `reports_visible=false`
- `0004_seed_dev_participants.sql` — test verisi (gerçek CSV import öncesi silinecek)
- `0005_future_features.sql` — Dalga 4 desteği, `participants.email`, `predictions`, `mirror_letters`
- `0006_seed_dev_assignments.sql` — test atamaları: kişi başı 2 gizli + 1 açık gözlem (CSV import öncesi silinecek)

### Test giriş kodları (geliştirme seed'i)

| Kod | Kişi | Takım / Şehir |
|---|---|---|
| `111111` | Ayşe Yılmaz | Kartallar / İstanbul |
| `222222` | Mehmet Demir | Kartallar / Ankara |
| `333333` | Zeynep Kaya | Şahinler / İzmir |
| `444444` | Ali Çelik | Şahinler / İstanbul |
| `555555` | Fatma Şahin | Aslanlar / Bursa |
| `666666` | Emre Topçu | Aslanlar / Ankara |
| `777777` | Elif Arslan | Kartallar / İzmir |
| `888888` | Burak Koç | Şahinler / Antalya |

Yönetici: `/admin/giris` + `ADMIN_PASSWORD` (kod `999999` katılımcı girişinden bilinçli olarak reddedilir).

## Puanlama Akışı (Faz 2)

- `/degerlendir` — değerlendirme merkezi: öz değerlendirme, gözlem listesi (atamalar), 🎯 tahmin oyunu kartı ve serbest puanlama (isim arama).
- **Öz-puan kapısı**: katılımcı, açık dalgada önce kendini (10 özellik) puanlamadan başkasını puanlayamaz. Kural hem UI'da (kilit), hem sayfada (redirect), hem API'de (403) uygulanır.
- `/degerlendir/[hedefId]` — 10 özellik × 1-10 puan. Başkasına verilen **6'nın altındaki her puan kısa bir yorum gerektirir** (API de doğrular, 500 karakter sınırı).
- **Offline taslak**: her değişiklik `localStorage`'a yazılır (`la_taslak_v1:{dalga}:{hedef}`); gönderim başarısız olursa taslak cihazda kalır, başarılı olursa silinir. Dalga açıkken puanlar yeniden düzenlenebilir (upsert).
- Dalga numarasını istemci değil **sunucu** belirler (`waves.is_open`); kapalı dalgaya yazma 409 döner.
- `/tahmin` — 🎯 tek seferlik tahmin: en yüksek/en düşük dış puan alınacak özellik. Gönderildikten sonra kilitlenir, Faz 4 raporunda gerçekle karşılaştırılır.

## Admin Paneli (Faz 3)

- `/admin` — **dalga kontrolü** (birini açmak diğerlerini kapatır) + **canlı ilerleme**: öz değerlendirme tamamlama, kişi başına verdiği/aldığı tam değerlendirme sayıları.
- `/admin/katilimcilar` — **CSV import**: sütunlar `ad` (zorunlu), `takim`, `sehir`, `telefon`, `eposta`; virgül veya noktalı virgül ayraç, Türkçe başlık varyasyonları tanınır. Her kişiye benzersiz 6 haneli kod üretilir (`crypto.randomInt`). Tehlikeli bölge: tüm katılımcıları silme ("SİL" yazarak onay).
- `/admin/eslestirme` — **eşleştirme algoritması**: kişi başı N gizli + M açık hedef; kendine/tekrar atama yok, farklı takım tercihli, gelen gözlem yükü dengeli. Çalıştırmak mevcut atamaları değiştirir (onay kutusu).
- `/admin/qr` — **QR giriş kartları**: `/giris?kod=` linkli SVG QR + kod; tarayıcının yazdır penceresinden PDF alınır (print CSS hazır).
- `/admin/moderasyon` — başkalarına yazılan yorumları listeler; gizlenen yorum (`is_hidden`) raporda görünmez, puan korunur.
- `/api/admin/*` rotalarının tamamı oturum üstüne **admin rol kontrolü** yapar (proxy yalnızca oturum doğrular).

## Ayna Raporu (Faz 4)

- `/ayna` — kişiye özel **Ayna Raporu**: en güçlü 3 / gelişime açık 3 özellik, **Johari vurguları** (gizli güç: dış − öz ≥ 1.5; kör nokta: tersi), 🎯 tahmin vs gerçek, 📖 **dalga yolculuğu** (dalga bazlı dış ortalamalar + en çok yükselen özellik), özellik özellik öz/dış çubukları, isimsiz yorumlar (`is_hidden=false`).
- 🪞 **Senkronize Ayna Anı**: `reports_visible=false` iken `/ayna` bekleme ekranı gösterir ve 5 sn'de bir `/api/ayna-durumu`nu yoklar; admin paneldeki "Aynaları Aç" düğmesi ayarı çevirince salondaki tüm telefonlar aynı anda rapora geçer.
- 🖼️ **Kelime Kartı**: en güçlü özellikten canvas ile üretilen 1080×1350 PNG; indirme + Web Share API ile paylaşım (ek kütüphane yok).
- 🤖 **AI Ayna Mektubu**: `@anthropic-ai/sdk` + `claude-opus-4-8` ile rapor verisinden 150-220 kelimelik kişisel mektup; `mirror_letters`a bir kez yazılır (PK yarışında önce yazan kazanır). Yorumlar modele isimsiz gider ve mektupta birebir alıntı yasak. Admin panelden **toplu ön-üretim** (çağrı başına 1 mektup, istemci döngüsü ilerlemeyi gösterir) + raporu açan katılımcı için tembel üretim. `ANTHROPIC_API_KEY` yoksa bu bölüm devre dışı, gerisi çalışır.
- Rapor hesaplama tek modülde (`lib/rapor.ts`) — sayfa ve mektup üretimi aynı sayıları kullanır.

## Vercel Deploy

Yeni Vercel projesi → bu repo → **Root Directory: `liderlik-aynasi`** → yukarıdaki env değişkenlerini tanımla. Ana uygulamanın Netlify deploy'u etkilenmez.

## Yol Haritası

- [x] **Faz 1** — Şema + RLS + seed + kod ile giriş akışı
- [x] **Faz 2** — Puanlama akışı (öz-puan kapısı, atanan kişiler, serbest puanlama, <6 puana zorunlu yorum, offline taslak) + 🎯 *"Kendini ne kadar tanıyorsun?" tahmin oyunu*
- [x] **Faz 3** — Admin paneli (CSV import, QR PDF, eşleştirme algoritması, dalga kontrolü, moderasyon)
- [x] **Faz 4** — Ayna Raporu + 🪞 *Senkronize "Ayna Anı" finali* + 🖼️ *paylaşılabilir Kelime Kartı* + 🤖 *AI Ayna Mektubu (Claude API)* + 📖 *Dalga yolculuğu hikâye modu*
- [ ] **Faz 5** — Büyük ekran (canlı) + 🕸️ *takım kimyası ağ haritası slaytı* + Vercel deploy
- [ ] **Faz 6** — 📬 *"90 gün sonra aynaya tekrar bak"* (Dalga 4 + e-posta daveti; şema hazır)
