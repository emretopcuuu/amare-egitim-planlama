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
| `POSTMARK_SERVER_TOKEN` | Postmark → Server → API Tokens — 90 gün sonrası davet e-postaları için |
| `EMAIL_FROM` | Postmark'ta doğrulanmış gönderici adresi (örn. `ayna@alanadi.com`) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | PWA push anahtarı (public) — `npx web-push generate-vapid-keys` |
| `VAPID_PRIVATE_KEY` | PWA push anahtarı (private) — aynı komuttan |
| `AYNA_TIK_SECRET` | AYNA tik ucunun gizli anahtarı — `openssl rand -hex 24`; Supabase cron aynı değerle çağırır |

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

## Büyük Ekran (Faz 5)

- `/ekran` — sahneye yansıtılan, **oturum gerektirmeyen** canlı gösterim. 14 sn'de bir dönen 3 slayt, 10 sn'de bir veri yenileme:
  1. **Kampın Nabzı** — katılımcı / verilen puan / öz ayna tamamlama / tam değerlendirme sayaçları
  2. **🕸️ Takım Kimyası** — gözlem ağı haritası: takım renkli **isimsiz** noktalar (gizli gözlem atamaları ele verilmesin), yönsüz bağlar, takımlar arası bağlar altın renkte + çapraz takım oranı
  3. **Kampın Kasları** — 10 özelliğin kamp geneli dış puan ortalaması (lider özellik 👑)
- `/api/ekran` herkese açıktır ve **yalnızca isimsiz agregalar** döner — isim, kod veya kişi bazlı veri asla çıkmaz.

## 90 Gün Sonra (Faz 6)

- `0007_wave4.sql` — **Dalga 4 — 90 Gün Sonra** kaydı (kapalı başlar; admin panel Dalga Kontrolü'nde otomatik listelenir).
- Admin panelde **📬 90 Gün Sonra** bölümü: e-postası kayıtlı katılımcı sayısı + **davet gönderimi**. Davetler Postmark ile parti parti (çağrı başına 10) gönderilir, ilerleme canlı görünür; tamamlanınca gönderim zamanı `settings.wave4_davet_gonderildi`e yazılır ve yeniden gönderim onay kutusu ister.
- Davet e-postası kişiye özel `/giris?kod=XXXXXX` linki taşır — herkes kamptaki koduyla geri döner; Dalga 4 puanları rapora ve dalga yolculuğuna kendiliğinden eklenir.
- Akış: Dalga 4'ü aç → davetleri gönder. `POSTMARK_SERVER_TOKEN`/`EMAIL_FROM` yoksa yalnızca bu bölüm devre dışı kalır.
- Davet, katılımcının kampın son gecesi AYNA'ya yazdığı **SÖZ'ü** de geri getirir: *"90 gün önce kendine şunu söz vermiştin…"*

## AYNA — Yapay Zekâ Kamp Direktörü (Faz 7)

Kampı "yapay zekâ yönetiyor" deneyiminin tamamı. AYNA birinci tekil şahıs konuşan bir personadır: görev verir, izler, puanlar, programı parça parça açıklar.

- **Görev motoru** — `claude-opus-4-8` her görevi kişinin verisine göre üretir (öz puanlar, hakkında biriken dış puanlar, önceki görevler). 5 tür: gözlem, cesaret, yansıma, gizli, tahmin. Gün 1 tanışma odaklı; Gün 2-3 veriye yaslanır (düşük öz puanlı / öz-dış farkı büyük özellikler hedeflenir).
- **Anında AI puanlama** — yanıt gönderilince AYNA 1-10 puan + yapıcı yorum verir; düşerse `submitted` kalır, tik kurtarır. **AI puanları insan puanlarına asla karışmaz** — raporda üçüncü mercek: Öz / Başkaları / **AYNA'nın Gözü** (yeşil çubuk). Ayna Mektubu iki kaynağı sentezler.
- **⚡ Kıvılcım** — görev başına taban 10 + AYNA puanı + zamanında bonus 5. Unvanlar: Çırak → Kaşif (50) → Alev (120) → Kor (220) → Efsane (350). Büyük ekranda 4. slayt: isimli Top 5 + takım yarışı.
- **Gizemli program** — `/program`: geçmiş ve açıklanmış maddeler görünür, gelecektekiler 🔒 kilitli kart (ipucu + açıklanma saati). AYNA her maddeyi `reveal_minutes` önce push ile duyurur.
- **Bildirimler (PWA)** — uygulama ana ekrana kurulur (manifest + service worker + ikonlar); `web-push`/VAPID ile gerçek push. iOS'ta ana ekrana ekleme şart — `AynaKurulum` bileşeni cihaza göre yönerge gösterir. Sessiz saatler: **22:30–07:30**.
- **Kalp atışı** (`/api/tik`, 5 dk'da bir, `x-ayna-anahtar` gizli başlığıyla): süre dolanları kapatır → gecikmiş puanlama (≤2) → görev dağıtımı (≤3, tempo: sürpriz 60-180 dk / sabit 2s / 3s; kişi başı günde ≤7) → teslim hatırlatması (son 30 dk) → program duyuruları → günlük fısıltılar ("bugün N göz seni puanladı", 13 ve 20 sularında).
- **AYNA Kontrol Odası** (`/admin/ayna-direktoru`) — uyandır/durdur, tempo, abone sayısı, manuel "Şimdi Tik Çalıştır", **SÖZ finali** düğmesi (herkese tek seferlik "kendine 90 günlük söz yaz" görevi — yanıt puanlanmaz, saklanır, Dalga 4 davetiyle geri döner), son 20 görevin canlı akışı.
- **Maliyet** — 60 kişilik kampta 3 gün ≈ $20-25 Claude kullanımı (görev üretimi + puanlama + mektuplar).

### Zamanlayıcı kurulumu (tek seferlik)

AYNA'nın kendiliğinden uyanması için Supabase SQL Editor'de (placeholder'ı Vercel'deki `AYNA_TIK_SECRET` değeriyle değiştir):

```sql
create extension if not exists pg_cron;
create extension if not exists pg_net;
select cron.schedule('ayna-tik', '*/5 * * * *', $$
  select net.http_post(
    url     := 'https://liderlik-aynasi.vercel.app/api/tik',
    headers := jsonb_build_object('x-ayna-anahtar', '<AYNA_TIK_SECRET>')
  )
$$);
```

AYNA `ayna_aktif=false` ile başlar — cron kurulu olsa bile panelden "Uyandır" denene dek hiçbir şey yapmaz. Kaldırmak için: `select cron.unschedule('ayna-tik');`

## Vercel Deploy

Yeni Vercel projesi → bu repo → **Root Directory: `liderlik-aynasi`** → yukarıdaki env değişkenlerini tanımla. Ana uygulamanın Netlify deploy'u etkilenmez.

## Yol Haritası

- [x] **Faz 1** — Şema + RLS + seed + kod ile giriş akışı
- [x] **Faz 2** — Puanlama akışı (öz-puan kapısı, atanan kişiler, serbest puanlama, <6 puana zorunlu yorum, offline taslak) + 🎯 *"Kendini ne kadar tanıyorsun?" tahmin oyunu*
- [x] **Faz 3** — Admin paneli (CSV import, QR PDF, eşleştirme algoritması, dalga kontrolü, moderasyon)
- [x] **Faz 4** — Ayna Raporu + 🪞 *Senkronize "Ayna Anı" finali* + 🖼️ *paylaşılabilir Kelime Kartı* + 🤖 *AI Ayna Mektubu (Claude API)* + 📖 *Dalga yolculuğu hikâye modu*
- [x] **Faz 5** — Büyük ekran (canlı) + 🕸️ *takım kimyası ağ haritası slaytı* + Vercel deploy
- [x] **Faz 6** — 📬 *"90 gün sonra aynaya tekrar bak"* (Dalga 4 + e-posta daveti)
- [x] **Faz 7** — 🤖 *AYNA: yapay zekâ kamp direktörü* (kişiye özel görev motoru + AI puanlama üçüncü merceği + ⚡ Kıvılcım ligi + gizemli program + PWA push + SÖZ finali)
