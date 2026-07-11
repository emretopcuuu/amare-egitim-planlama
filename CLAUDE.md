# Liderlik Aynası — Proje Hafızası (Claude için)

> Bu dosya her yeni Claude Code oturumunda otomatik okunur. Amaç: yeni bir oturumun
> (masaüstü veya mobil/web) projeyi, kararları ve çalışma kurallarını sıfırdan
> öğrenmeden devam edebilmesi. Önemli bir karar değişince burayı güncelle.

## Proje nedir

**Liderlik Aynası** — 3 günlük bir network marketing liderlik kampı için 360°
liderlik değerlendirme + kişisel gelişim uygulaması. ~29 aktif katılımcı.
Repo kökündeki eski Vite+Firebase uygulamasına **dokunulmaz**; bu uygulama
bağımsız olarak **`liderlik-aynasi/`** alt klasöründe yaşar.
Repo'da ayrıca **`emretopcu-com/`** var: Emre'nin kişisel marka sitesi
(**emretopcu.ai** — emretopcu.com başka bir adaşın çıktı; domain Cloudflare
Registrar'dan alındı). Next.js 16 + Tailwind v4 + three.js, tek sayfa,
Türkçe, sinematik 3D tasarım. Kampla ilgisi yok; Cloudflare Pages yayın
adımları ve içerik TODO'ları kendi README'sinde.

- **Stack:** Next.js 14+ (App Router) + TypeScript + Tailwind
- **Deploy:** Netlify (production = `main` branch). Canlı adres:
  `ayna.oneteamglobal.ai` (kamp uygulaması, base dir = `liderlik-aynasi/`).
  ⚠️ **DÜZELTME (11 Tem):** `marvelous-pasca-fbfa40` Netlify sitesi kamp
  uygulaması DEĞİL — o site `s-emretopcu` hesabındaki **egitimtakvimi.
  oneteamglobal.ai** (repo KÖKÜNDEKİ eski Vite+Firebase takvim app'i,
  base dir = root, `netlify/functions/` firebase-admin kullanır). Kamp
  uygulaması (ayna.oneteamglobal.ai) o hesapta GÖRÜNMÜYOR — farklı bir
  Netlify hesabında/token'ında. Netlify env (AYNA_SES_ID gibi) veya
  fonksiyon değişikliği yaparken hangi siteye dokunduğunu MUTLAKA
  `custom_domain` ile doğrula; kök `FIREBASE_*` değişkenleri egitimtakvimi
  fonksiyonları için ZORUNLU (functions kapsamı), kaldırma.
- **CI:** Bloklayan CI **yok** ama `.github/workflows/deploy-bekcisi.yml`
  var — her main push'unda egitimtakvimi'yi smoke-test eder (kisalt fonksiyonu
  dahil); kırıksa e-posta gönderir. Kamp app doğrulaması için
  `cd liderlik-aynasi && npx tsc --noEmit`.

## Veritabanı (Supabase)

- **Proje ID:** `swxfxeuxlriuoecjxdla`
- **Erişim modeli:** Tüm DB erişimi yalnızca sunucu tarafında **service-role** ile.
  RLS tüm tablolarda **açık ama sıfır policy** (anon/authenticated için deny-all) —
  derinlemesine savunma. Tarayıcıya giden anon key hiçbir tabloyu okuyamaz.
- **Migration kuralı:** SQL'i `liderlik-aynasi/supabase/migrations/NNNN_ad.sql`
  olarak yaz **ve** Supabase MCP `execute_sql`/`apply_migration` ile **canlıya uygula**.
  İkisi birden yapılmazsa kod ile DB ayrışır (bkz. aşağıdaki kariyer constraint hatası).
- **Kariyer ladder'ı (8 basamak, One Team Global gerçek ladder'ı):**
  `leader < senior_leader < exec_leader < diamond < 1_star_diamond < 2_star_diamond < 3_star_diamond < presidential_diamond`.
  Tek doğruluk kaynağı: `liderlik-aynasi/lib/persona.ts`
  (`KARIYER_RANK`/`KARIYER_ETIKET`/`KARIYER_SECENEKLER`). Etiketler `lib/i18n/tr.ts`.

## Auth / oturum

- Katılımcı `/giris?kod=XXXXXX` ile girer; 6 haneli kod → `jose` HS256 JWT,
  HTTP-only `la_oturum` çerezi (4 gün, sameSite lax).
- Admin: `/admin/giris` — env `ADMIN_PASSWORD`. Admin çerezi `rol: 'admin'`.
- Tüm metinler tek modülde: `liderlik-aynasi/lib/i18n/tr.ts` (Türkçe).

## Önemli akışlar

- **Pusula** (`/pusula`, `app/pusula/PusulaSohbet.tsx`): rıza → kariyer konumu formu
  → 10 öncelik → AI sohbeti → slogan. Persona motoru (A/B/C/A+) kariyer momentumundan
  türetilir (`lib/persona.ts`, `lib/pusula.ts`).
- **Kamp grup atama** (`/oyun-secimi`): katılımcı 3 oyundan 2'sini seçer
  (Big Bubble, ATV, Hazine Avı) + Bowling zorunlu; sisteme göre en az dolu eşleşen
  **Grup 1–15**'e otomatik atanır (`lib/cumartesiProgrami.ts`,
  `app/api/oyun-secimi/route.ts`). **Takımlar elle atanmaz.**
- **Ses Ritüeli** (`components/AynaRituel.tsx`): davet → onay → yemin → soru → ses.
  Selfie/foto adımı **kaldırıldı** (tek fotoğraf anı = Canlı Ayna'nın "düz" karesi,
  o da avatar + video referansı olur).
- **Kriz akışı:** umutsuzluk/kriz dili görülürse uyarı **Presidential Diamond
  upline'a** `KRIZ_EPOSTA` env ile gider. 112 vb. **kullanma**.
- **Ses efektleri:** kısa foley'ler `liderlik-aynasi/public/sfx/*.mp3` (ElevenLabs
  Text-to-SFX; kullanıcı üretip onaylar). Tek yardımcı `lib/sesEfekti.ts` →
  `sesCal("<ad>")`; ses başına 2.5s soğuma + iki ses arası 350ms aralık →
  "rahatsız edici tekrar" olmaz. Aç/kapa **ayarlar çekmecesinde**
  (`KimsinBantClient`), varsayılan AÇIK (`localStorage la_ses_efektleri`).
  11 ses tetikleyicilere bağlı (kivilcim/fiero/muhur/kart-ac/rituel-yemin/
  kayit-zili/streak/gorev-basla/mozaik/sesli-mektup/domino). **ÖNEMLİ:** statik
  ses uzantıları (mp3/wav/ogg) `proxy.ts` matcher'ında negatif-lookahead'e dahil
  — public `/ekran`,`/sahne` sesleri auth'suz yüklensin diye; yeni ses/varlık
  eklerken bu deseni bozma. Server bileşenlerinde `components/SesTetik.tsx`
  (mount'ta çalar).

## Çalışma kuralları (kullanıcının kalıcı talimatları)

- **"Her seferinde sorma, direk merge et":** PR'lar CI yeşilken (gerçek CI olmadığı
  için `tsc` temizse) doğrudan squash-merge edilir. Ayrı onay bekleme.
- **Branch deseni:** Her iş için `main`'den yeni `claude/...` branch → draft PR →
  ready → squash merge. (Tarihsel "geliştirme branch'i" `claude/liderlik-aynasi-app-pi39lm`
  main'in gerisinde kaldı; **main'i esas al**.)
- **Kampı kullanıcı "kampı aç" demeden AÇMA.** Takımları elle atama, eşleştirme
  oluşturma, dalga açma gibi kamp operasyonlarını **kullanıcı açıkça istemeden yapma.**
- Git commit mesajı sonuna eklenecek satırlar harness tarafından belirleniyor;
  model kimliğini (model ID) commit/PR/koda **yazma**, sadece sohbette söyle.

## Kampın mevcut durumu (değişince güncelle)

- **KAMP HENÜZ AÇILMADI — ONBOARDING DÖNEMİ.** Sıradaki kamp **17-19 Temmuz 2026**
  (Sapanca), **~150 katılımcı**. Şu an katılımcılar gerçek onboarding aşamasında
  (kod alma, değerler, pusula/hedef, ön farkındalık, ses ritüeli). Kilit kodu
  `SAPANCA2026`. `settings.kamp_tarihi = 2026-07-17T10:00+03`.
- **`ayna_baslangic` HENÜZ SET DEĞİL** → `kampGunu` null → `mod=kamp` görev
  üretimi UYKUDA. tik her 5 dk çalışıyor ama yalnız onboarding dürtmesi/olaylar
  için; insanlara kamp görevi DÜŞMÜYOR. Kamp, kullanıcı "kampı aç" deyince /
  `ayna_baslangic` set edilince başlar (17 Temmuz).
- **BUNUN ANLAMI:** `mod=kamp` görev motoru (ayna.ts/davranis.ts/tik.ts kamp
  dalları) şu an güvenle geliştirilebilir — canlı bir kampı bozmaz; 17 Temmuz'da
  devreye girer. Ama onboarding/olaylar hot-path'ine (her 5 dk çalışıyor) cerrahi
  dokun. Yine de **kampı kullanıcı istemeden AÇMA** (bkz. çalışma kuralları).
- Senaryoda bekleyen özel olaylar (kamp açılınca): Gün 2 21:00 sesli mektup
  (`gun2_sesli_mektup_ac`), Gün 3 10:00 domino (`gun3_domino_ac`).

## AYNA KARAKTER PROJESİ (sürüyor — faz faz)

AYNA "bilge koç"tan **kampın şovmenine** dönüşüyor: egolu-kırılgan, iddiacı,
küsen, running gag'li (bowling korkusu, Sapanca Gölü rekabeti, KVKK, 4. duvar)
ama ASLA katılımcıyı kırmayan karakter. Higgsfield = stüdyo (kamp öncesi statik
asset üretimi), uygulama = sahne (kampta CANLI üretim YOK). Kill switch:
`settings.ayna_karakter_acik="false"` → nötr ton. Plan (16 Tem akşamı kod donması):

- ✅ **Faz 0** (PR #738, merged): `lib/aynaKarakter.ts` karakter anayasası
  (TAM/HAFİF doz + mizah güvenlik kuralları) → gorevUret (%15 karakter anı,
  kod seçer) + koçu (tam) + pusula (hafif) enjeksiyonu; boş ekranda "günün
  lafı" (statik havuz). Küs/barışma metin havuzları Faz 2 için hazır.
- ✅ **Faz 1** (PR #739, merged): güneş-çerçeveli ayna maskotu (kullanıcı 3
  aday arasından #3'ü seçti; Higgsfield nano_banana_pro + bg remove + sharp).
  `public/ayna/*.webp` 8 poz (notr/konusuyor/etkilenmis/kus/korkmus/gururlu/
  saskin/kutlama, 512px ~65KB) + `components/AynaYuzu.tsx`. Koçu başlığı,
  boş görev ekranı, aktif görev kartı köşesine yerleşti. Referans job id
  (yeni poz üretmek için): Higgsfield b4e54156-a4d4-4d5a-948b-b8646915f33d.
- ✅ **Faz 2** (PR #741): küslük modu — `aynaIliskiDurumu` son görev yanıtından
  DETERMİNİSTİK (36s serin / 72s küs; hiç yanıt yoksa sıcak — yeni gelen küs
  karşılanmaz; kampta 72s dolmayacağı için küslük fiilen onboarding/90-gün
  mekaniği). Küs: boş ekran + koçu başlığında küs poz + soğuk laf havuzu +
  görev/koçu prompt satırı; barışma: gorev-yanit'ta önceki yanıt küs eşiğini
  aştıysa yorumun başına abartılı barışma cümlesi (krizde kapalı). Lakap:
  3. scored görevde tek Haiku çağrısı (`lakapUret`, katı kurallar, fail-open)
  → participants.ayna_lakap (migration 0140, canlıda) + push duyurusu +
  görev/koçu prompt'unda "arada bir kullan". Admin düzenleme UI'ı YOK
  (gerekirse SQL); istenirse sonra eklenir.
- ✅ **Faz 3** (PR #742): iddia sistemi — kamp modunda karakter anlarının
  yarısı BAHİS çerçevesi (net ~%7-8 görev; yalnız tik dağıtımında,
  `bahisIzin` + missions.bahis, migration 0141 canlıda). Görev kartında mor
  "🎲 AYNA–İtirazcı bahsi · hakem sensin" rozeti; tamamlanınca yorum sonuna
  zafer metni (BAHIS_ZAFER_METINLERI); süresi dolarsa İtirazcı kazanır —
  yalnız SKORDA görünür (kaçıran kişiye laf edilmez; kaybeden DAİMA karakter).
  Skor `bahisSkoru(db, gunBasi)` ile türetilir (scored=AYNA, expired=İtirazcı)
  — Faz 4 radyosu okuyacak. Johari/şahit override ve İki Kapı bahisle çakışmaz.
  ✅ **Faz 4** (PR #743): Kamp Radyosu — `lib/kampRadyosu.ts`, tik'ten çağrılır
  (yalnız mod=kamp). Sabah 07:30 (program + İDDİALI TAHMİN, radyo_yayin.tahmin'e
  saklanır) + akşam 21:30 (isimsiz dedikodu — prompt'a YALNIZ toplam sayılar
  girer, kişisel veri sızamaz — + günün bahis skoru + sabah tahminiyle
  yüzleşme). Üretim yayından 20 dk önce; fallback zinciri: AI script düşerse
  ŞABLON metin (gerçek sayılarla), TTS düşerse salt-metin — radyo asla susmaz.
  Ses: aynaSesId() marka sesi → sesler/radyo/*.mp3. Tablo radyo_yayin
  (migration 0142, canlıda; unique(tarih,slot) idempotent). /gorevler'de çalma
  kartı (SesCal + metin); yayında herkese push.
- ✅ **Faz 1.5** (PR #744): 8 poza CSS mikro-animasyon (nefes/sallanma/titreme/
  zıplama vb, `ayna-anim-*` sınıfları, reduced-motion'da kapanır).
  ✅ **Faz 1.5b** (PR #745): 3 Higgsfield video loop'u (bekleme/konuşma/kutlama,
  5sn 720p statik MP4, `public/ayna/loop-*.mp4`) → `components/AynaSahneLoop.tsx`
  (video oynamazsa statik poza düşer), /ekran başlığında sürekli bekleme
  döngüsü. proxy.ts istisnasına mp4|webm eklendi.
  ✅ **Faz 4.5** (PR #747): /ekran radyo yayınına geçince GERÇEK sesi otomatik
  çalar (`ekranSinyali()`, ≤4dk taze, fiero/anons deseniyle aynı), ses
  sürdüğünce maskot "konusma" pozunda (onplay/onended ile AynaSahneLoop mod
  geçişi) — maskot yalnız gerçekten sesi varken konuşur gibi görünür.
  **BİLİNÇLİ YAPILMADI:** yayın başına gerçek dudak-senkronlu video (Higgsfield
  canlı çağrısı) — deploy edilmiş sunucudan canlı üretim isteği "kampta canlı
  üretim yok" ilkesini bozar; onaylı jenerik loop + gerçek ses kombinasyonu
  yeterli kabul edildi. Tekrar gündeme GETİRME.
- ✅ **AYNA tek resmî ses** (PR #746): erkek/kadın ses seçimi onboarding'den
  kaldırıldı (bir adım kısaldı) — karakterin artık TEK sesi var. `aynaSesId()`
  paramsız. Kullanıcı seçtiği ElevenLabs "Roman" sesini klonlattı (Instant
  Voice Clone, 3 örnek dosyayla) → **Voice ID `ETJ6UWphnI0eywAW0rIS`**,
  Netlify env `AYNA_SES_ID`'ye yazıldı ve deploy edildi (canlıda).
  Yan bulgu düzeltildi: Netlify fonksiyon paketi 4KB sınırını aşıp TÜM
  deploy'ları bloke ediyordu (`FIREBASE_PRIVATE_KEY` vb. kullanılmayan eski
  değişkenler ~1700 bayt kaplıyordu — bu kod tabanında hiç referans yok, ayrı
  eski Vite+Firebase app'ten kalma). Bu üç değişkenin "functions" kapsamı
  kaldırıldı (değer silinmedi, yalnız fonksiyon paketinden çıkarıldı) — kalıcı
  düzeltme, gelecekteki deploy'ları da kurtarır.
- ⬜ **Faz 5**: prova + 16 Tem donma. ⬜ **Faz 6**: kamp
  sonrası (haftalık bülten, mezuniyet videoları — Higgsfield canlı burada).

## Son tamamlanan işler

- **Eğlence/sürtünme paketi (saha geri bildirimi: "en sıkıcı şey" + "sesli
  yazma duymuyor")** — 3 PR, merged:
  - **PR #734 sesli yazma güvenilirliği:** `MikrofonButonu` boş kayıt/boş
    çeviriyi artık SESSİZ geçmiyor; başarısız çeviride kayıt saklanır +
    "↻ Tekrar gönder"; 429'da motor tarayıcıya DÜŞÜRÜLMEZ (yalnız 503 veya
    üst üste 2 serviste); AnalyserNode ile GERÇEK VU metre + 4 sn gerçek
    sessizlikte "mikrofon ses almıyor" uyarısı. Yeni tr.ses metinleri.
  - **PR #735 "Anlat, ben yazayım":** `MikrofonButonu`'na `belirgin` modu
    (büyük birincil düğme). Ön farkındalıkta mikrofon textarea'nın ÜSTÜNDE,
    değerlendirme yorumunda belirgin. Pusula'nın YEREL salt-Web-Speech
    SesButonu'su kaldırıldı (iOS'ta "duymuyor"un muhtemel kaynağı) → ortak
    MikrofonButonu (ikon, Scribe destekli).
  - **PR #736 dönüş biçimi rotasyonu:** son İKİ AI görevi aynı
    `donus_bicimi`ndeyse üçüncüde o biçim YASAK (`yasakDonusBicimi` bağlam +
    sert prompt kuralı + kod tarafı ret, `tekrar_degil` deseni).
  - Bekleyen eğlence önerileri (kullanıcı 26'lık listeden 1-9-16'yı seçti;
    gerisi yapılmadı): yeni-gelen modu, kart destesi/swipe değerlendirme,
    zarf+mühür, verdikçe açılır, tahmin katmanı, kamp bileti, QR noktaları,
    kamp radyosu vb.
- **Kamp görev motoru #4 — kümelenmiş-paralel dağıtım** (PR #732, merged):
  `lib/tik.ts` dağıtım döngüsü sıralıydı (her `gorevUret` ~2 AI çağrısı,
  birbirini bekliyordu, kamp tavanı 5/tik) → etkinlik-sonrası patlamada 30-40
  kişiye görev ~35 dk kuyrukta damlıyordu. Gövde `kisiyeGorevDagit(k)`'e alındı
  (`continue`→`return`), `ES_ZAMAN=6` eşzamanlılıkla kümelenmiş `Promise.all` ile
  dağıtılıyor; kamp tavanı 5→24. Kişi başına görev sayısı/kalitesi DEĞİŞMEZ,
  yalnız duvar-saati düşer (~6× hızlanma, patlama gecikmesi ~35 dk→~1-2 tik).
  Altın kotası `await`'ten önce eşzamanlı düşülür; eşzamanlılık 6'da tutuldu
  (`eslesmeHedefiSec` DB yarışı küçük kalsın). `app/api/tik` `maxDuration` 60→120.
  Tahmini kamp günlük AI maliyeti ~$25-32/gün (3 gün ≈ $80-105).
- **Ayna ses efektleri** (PR #700, merged): 11 ElevenLabs SFX + `lib/sesEfekti.ts`
  + ayarlarda aç/kapa (varsayılan açık) + `proxy.ts` statik-ses muafiyeti.
  11/11 tarayıcıda çalar test edildi. (Bkz. Önemli akışlar → Ses efektleri.)
- **/hedef ara hedef ayı düzeltmesi** (PR #701, merged): kilometreTaslari ara
  hedefleri sabit 1/3–2/3 yerine OV/VOLL **simülasyonundan** türetiliyor; artık
  ekrandaki tabloyla tutarlı (katılımcı bildirimi "6. ay 2 Star tutmuyor" → ~10.
  ay). `kariyerPlaniHesapla`'ya opsiyonel `kapi` param.
- **Onboarding Radarı** (PR #696/#697/#699, merged): 142 kişinin hepsi listede;
  "Giriş yaptı" hunisi + tıklanabilir çubuklar; seçip **toplu WhatsApp kuyruğu**
  veya **toplu dürtme** ("hiç dürtülmemişe" filtresiyle). Bildirim izni yoksa
  onboarding ayar dişlisinde kırmızı uyarı + büyük "Bildirimleri Aç" (PR #696).
- Kişisel marka sitesi **CANLIDA: https://emretopcu.ai** (Cloudflare Pages,
  proje `emretopcu-ai`, hesap s.emretopcu@gmail.com; apex+www proxied CNAME
  → emretopcu-ai.pages.dev). Seçilen tasarım: sinematik 3D "video scroll"
  (Zirve, PR #614); Instagram @emretopcu_official (PR #615-616); .ai geçişi
  + statik export PR #618. Yeniden deploy: README'deki tek wrangler komutu
  (yeni CF token gerekir; ilk token kullanıcıda, silinebilir). Bekleyen
  içerik: portre fotoğrafı. (İlk sürüm PR #612.)
- Kariyer seviyeleri 8 basamağa düzeltildi (PR #313, merged).
- Ses Ritüeli'nden foto adımı kaldırıldı (PR #312, merged).
- Pusula kariyer formu: DB CHECK constraint 8 basamağa genişletildi
  (migration `0060_kariyer_8_basamak.sql`, canlıya uygulandı) + form sadeleştirildi
  ("şu anki" alanı en yüksek kariyeri de kapsar; "geçen ay hangi kariyerle bitirdin?")
  → PR #314.
