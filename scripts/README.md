# Vimeo Local Ingest Scripts

Tek seferlik 2000 video ingest + AI kategorize. Local'de çalıştırılır.

## Kurulum

```bash
cd scripts
cp .env.example .env
# .env'i doldur (FIREBASE_*, VIMEO_TOKEN, GEMINI_API_KEY)
npm install
```

**Firebase service account JSON:** Firebase Console → Project Settings → Service Accounts → Generate New Private Key. JSON dosyasından `client_email`, `private_key`, `project_id` alanlarını `.env`'e kopyala.

## Kullanım

### 1. Transcript JSON kontrol
Default path: `%USERPROFILE%\Desktop\OneTeamAI-Automation\deploy\netlify\functions\turkish-transcripts.json`
Farklıysa `.env` içine `TRANSCRIPTS_PATH=...` yaz.

### 2. Dry-run (yazma yapmaz, ilk 20 sample basar)
```bash
node vimeo-ingest-local.mjs --dry-run
```
Çıktıyı incele: eğitmen eşleşmesi doğru mu, Kayene filtresi çalışıyor mu, metadata eksik mi.

### 3. Limited ingest (100 video test)
```bash
node vimeo-ingest-local.mjs --limit=100
```

### 4. Full ingest (~2000 video)
```bash
node vimeo-ingest-local.mjs
```
Çalışma süresi: Vimeo API ~20 sayfa × ~1 sn + Firestore batch yazma → 2-5 dakika.

### 5. Kategorize (Gemini)
```bash
node vimeo-kategorize-local.mjs --dry-run --limit=10   # önce dene
node vimeo-kategorize-local.mjs --limit=200            # batch
node vimeo-kategorize-local.mjs                        # 50'şer çalışır, gerek varsa tekrar
```
~2000 video için ~10-15 dakika (rate limit dostu 400ms gecikme).

`--force` ile mevcut kategorileri yeniden hesapla (manuel atama silinmez sadece `pending` değilse atlanır).

## Firebase Rules + Index Deploy

İlk ingest'ten ÖNCE rules + composite index'leri deploy et:

```bash
# Proje kökünden (scripts/ değil)
cd ..
firebase login                      # ilk seferse
firebase deploy --only firestore    # rules + indexes
```

Çıktı:
```
✓ firestore: released rules firestore.rules
✓ firestore: deployed 5 indexes successfully for ...
```

Index oluşturma 2-10 dakika sürer (asenkron). Console → Firestore → Indexes'ten "Building" durumunu izle. Bitmeden query yaparsan "missing index" hatası alabilirsin.

## Notlar

- `transcript` Firestore'a 800K karakter sınırıyla yazılır (1 MB doc limiti).
- `--skip-vimeo` ile sadece transcript JSON kullan (thumbnail/duration boş kalır). Yalnız transcript güncellemek istiyorsan kullan.
- Kayene'li videolar `kayeneFiltrelendi: true` ile YAZILIR ama UI'da gözükmez (rules + query filtresi).
- Eşleşmemiş videolar admin panelden manuel atanır.
