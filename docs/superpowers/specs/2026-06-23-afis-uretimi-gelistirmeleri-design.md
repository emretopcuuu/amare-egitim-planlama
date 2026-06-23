# Afiş Üretimi Geliştirmeleri — Tasarım

**Tarih:** 2026-06-23
**Kapsam:** "Görsel Hazırla" (afiş) sistemine 4 geliştirme. Hepsi tek seferde.
**Onaylanan kararlar:** Rol etiketleri = 3 ayrı kutu + tam otomatik. #4 = hem A (Şablon Sadık) hem B (Maskeli AI) seçilebilir mod. Sıralama = hepsi birlikte.

---

## Mevcut mimari (özet)

- **Modal:** `src/components/GorselOlusturModal.jsx` — "AI ile Oluştur" sekmesi: şablon grid (`sablonlar` prop, Firestore `/sablonlar`), format (Kare/Story/Yatay), üretim yöntemi (Hibrit/Gemini/Canvas/OpenAI Pro), düzenlenebilir etiket kutusu (`ekPrompt`).
- **4 generator:**
  - `src/utils/gorselOlustur.js` — Gemini (tam AI, prompt'a gömme)
  - `src/utils/gorselOlusturCanvas.js` — Canvas (deterministik, şablon arka plan + üst/alt %20 karartma)
  - `src/utils/gorselOlusturHibrit.js` — Gemini arka plan + Canvas içerik
  - `src/utils/gorselOlusturOpenAIPro.js` — gpt-image-2 edits, pre-composite (yüzler sabit)
- **Eğitmen modeli:** Firestore `/konusmacilar/{coreId}` — `ad`, `unvan`(tek), `fotoURL`, `biyografi`, `linkedin`. Form: `src/components/YeniEgitmenModal.jsx`. Light alanlar: `DataContext.jsx` `KONUSMACI_LIGHT_FIELDS`.
- **Etiket akışı:** `GorselOlusturModal.jsx:34-51` `ekPrompt`'u `e.unvan`'dan otomatik doldurur. Canvas/Hibrit `egitmenler[].unvan`'ı doğrudan da okur.
- **Adres:** Sadece `egitim.yer`, kırpılıyor (Canvas ~50, Hibrit ~55 karakter). `mekanAdi`/`acikAdres` afişte kullanılmıyor.
- **Foto düzeni:** `egitmenler` grid, max 4 sütun, `ceil(n/4)` satır; kişi artınca foto küçülüyor (min 140px).
- **Etkinlik türü sinyalleri:** `kategori` (KATEGORILER: Liderlik, Satış, …, Vizyon Günü, Panel, Diğer), `etkinlikTuru` (serbest metin), online tespiti (`sehir==='Online'` || `yer` ZOOM içerir).

---

## #1 — Rol-bazlı eğitmen etiketleri (otomatik)

### Veri modeli
`/konusmacilar/{id}`'ye 3 yeni opsiyonel alan:
- `meslek` — Amare-dışı meslek/unvan (örn. "Kd.Albay (E)")
- `amareKariyer` — Amare kariyeri (örn. "3 Star Diamond")
- `doktorBrans` — tıp branşı (örn. "Dahiliye ve Fonksiyonel Tıp Uzm.")

`unvan` korunur → **legacy fallback**. Eski veriler bozulmaz.

### Form (`YeniEgitmenModal.jsx`)
Tek `unvan` input'u yerine 3 etiketli küçük input: Meslek / Amare Kariyeri / Doktor Branşı. Ek olarak opsiyonel "Varsayılan unvan (fallback)" alanı (eski `unvan`). Kaydetme: 4 alanı da yazar (boşlar `null`).

### Otomatik eşleme (afiş üretiminde)
Yeni util `src/utils/egitmenEtiket.js`:

```
afisTuru(egitim) →
  'brans'  : kategori === 'Panel'  VEYA  /sağlıklı yaşam|panel/i  (etkinlikTuru || egitim başlığı)
  'meslek' : kategori === 'Vizyon Günü'  VEYA  (fiziki etkinlik && yukarıdaki değil)
  'amare'  : aksi halde (online sabah/akşam Zoom eğitimleri = varsayılan)

etiketSec(speaker, tur) →
  tur='brans'  → doktorBrans
  tur='meslek' → meslek
  tur='amare'  → amareKariyer
  fallback (seçilen boşsa): unvan → ilk dolu (meslek/amareKariyer/doktorBrans) → ''
```

`fiziki etkinlik` = `sehir !== 'Online' && !yer.includes('ZOOM')` (mevcut tanım).

### Entegrasyon (minimum generator değişikliği)
`egitmenler[]` modal için kurulurken (AdminPanel'de `egitmenFotosuBul` sonrası, ~`AdminPanel.jsx:527-545`) her konuşmacıya çözülmüş etiket `unvan` alanına yazılır:
`e.unvan = etiketSec(speaker, afisTuru(egitim))`.
Böylece downstream (ekPrompt autofill, Canvas, Hibrit, OpenAI, Gemini) **değişmeden** doğru etiketi alır. Ham alanlar Firestore'da kalır; etiket üretim anında hesaplanır.

`DataContext.jsx` `KONUSMACI_LIGHT_FIELDS`'e `meslek, amareKariyer, doktorBrans` eklenir (fotoURL'siz erişim için).

Modal'a küçük bilgi satırı: "Tespit edilen afiş türü: <Vizyon/Panel/Online> → <hangi bilgi yazılıyor>". Etiket kutusu yine elle düzenlenebilir (mevcut davranış).

---

## #2 — Tam adres (fiziki etkinlik)

Yeni util `afisAdres(egitim)` (egitmenEtiket.js veya ayrı):
- Online → `egitim.yer` (Zoom bilgisi, aynen).
- Fiziki → `[mekanAdi, acikAdres].filter(Boolean)` — **tam, kırpmasız**. Canvas'ta çok satıra sarılır.

Generator değişiklikleri:
- **Canvas** (`gorselOlusturCanvas.js:342-343`): tek satır + kırpma yerine `wrapText` ile çok satır; uzunsa font küçült (alt bölge taşmasın).
- **Hibrit** (`gorselOlusturHibrit.js:424-431`): aynı çok-satır mantığı.
- **Gemini** (`gorselOlustur.js:203`): prompt'a tam adres.
- **OpenAI** (`gorselOlusturOpenAIPro.js:171`): prompt'a tam adres.

Gerekirse paylaşılan bir canvas `wrapText(ctx, text, maxWidth)` yardımcısı (yoksa eklenir).

---

## #3 — Çok katılımcılı foto düzeni

Yeni util `fotoYerlesim(n)` → satır dağılımı:
- n≤3 → `[n]` (tek sıra)
- 4 → `[2,2]`
- 5 → `[3,2]`
- 6 → `[3,3]`
- n>6 → `[ceil(n/2), floor(n/2)]` (iki dengeli sıra, üst ≥ alt)

Eksik (alt) sıra **ortalanır** (x offset ile). **Foto boyutu küçültülmez:** cömert taban çap korunur (≥~200px @1080 taban); sığması için satır yüksekliği/metin küçültülür, foto değil. Mutlak gerekirse foto için yüksek bir alt sınır (örn. 160px).

Uygulama: Canvas (`gorselOlusturCanvas.js:206-334`) ve Hibrit (`gorselOlusturHibrit.js:286-412`) grid bloğu `fotoYerlesim` ile değiştirilir. OpenAI pre-composite (`gorselOlusturOpenAIPro.js:47-108`) aynı dağılımı kullanır.

---

## #4 — İki yeni "şablon" üretim modu (seçilebilir)

`GorselOlusturModal.jsx` üretim yöntemi satırına (`365-414`) 2 yeni buton; dispatcher + fallback zincirine eklenir.

### A — Şablon Sadık (deterministik, ücretsiz, anlık)
Yeni util `src/utils/gorselOlusturSablonSadik.js` (Canvas tabanlı):
- Şablon **%100 aynen** taban (`drawImage` cover-fit). **Üst/alt %20 karartma YOK.**
- Okunabilirlik için yalnız **her metin bloğunun arkasına lokal yarı saydam yuvarlak gölge** (scrim).
- Başlık (üst) → fotoğraflar (orta, `fotoYerlesim`) → bilgi/adres (alt). Etiketler #1, adres #2, düzen #3 kurallarıyla.
- Logolar canvas içinde çizilir (`logolariEkle` çağrılmaz).

### B — Şablon + AI (maskeli, ~$0.08, sonuç değişken)
Yeni util `src/utils/gorselOlusturMaskeliAI.js` (OpenAI `images/edits`):
- Taban = şablon. Gerçek yüzler korunsun diye fotoğraflar **önce şablona pre-composite** edilir (mevcut OpenAI Pro yaklaşımı, `gorselOlusturOpenAIPro.js:47-108` yeniden kullanılır).
- **Maske PNG:** sadece içerik bölgeleri (başlık bandı, bilgi/adres bandı, dekoratif boşluklar) şeffaf = AI düzenleyebilir; şablonun geri kalanı opak = korunur.
- Prompt: maskeli alanları şablon paletinde yazı + ince dekorla doldur; maske dışına dokunma. Etiket/adres/düzen kuralları prompt'a.
- `logolariEkle` post-process.
- **Risk notu:** üretken model çıktısı değişken; maske kaçakları olabilir. Fallback zincirinde sonuç başarısızsa Şablon Sadık (A)'ya düşülür.

### Fallback zinciri (güncel)
- Şablon Sadık (A): başarısız olmaz (deterministik) → zincir sonu güvenli liman.
- Şablon + AI (B): başarısız → A.
- Mevcut zincirler korunur; A her zaman son çare olarak eklenir.

---

## Etkilenen dosyalar (özet)

| Dosya | Değişiklik |
|---|---|
| `src/components/YeniEgitmenModal.jsx` | 3 yeni etiket alanı + legacy unvan; kaydetme |
| `src/context/DataContext.jsx` | KONUSMACI_LIGHT_FIELDS += meslek, amareKariyer, doktorBrans |
| `src/utils/egitmenEtiket.js` (yeni) | afisTuru, etiketSec, afisAdres |
| `src/utils/fotoYerlesim.js` (yeni) | satır dağılımı yardımcısı |
| `src/pages/AdminPanel.jsx` | egitmenler[] kurarken etiket çöz; modal'a türü/adres geç |
| `src/components/GorselOlusturModal.jsx` | etiket autofill etiketSec ile; tespit bilgi satırı; 2 yeni mod butonu + dispatch |
| `src/utils/gorselOlusturCanvas.js` | adres çok-satır; fotoYerlesim |
| `src/utils/gorselOlusturHibrit.js` | adres çok-satır; fotoYerlesim |
| `src/utils/gorselOlustur.js` | prompt'a tam adres |
| `src/utils/gorselOlusturOpenAIPro.js` | prompt'a tam adres; fotoYerlesim |
| `src/utils/gorselOlusturSablonSadik.js` (yeni) | Mod A |
| `src/utils/gorselOlusturMaskeliAI.js` (yeni) | Mod B |

## Kapsam dışı
- Excel import'a etiket kolonu yok (eğitmen alanları formdan girilir).
- Maske bölgelerini elle ayarlama UI'ı yok (B sabit bölgeler kullanır).

## Geriye dönük uyumluluk
- 3 yeni eğitmen alanı opsiyonel; boşsa `unvan` fallback. Eski afişler/eğitmenler etkilenmez.
- Online etkinliklerde adres davranışı değişmez.
- Mevcut 4 üretim yöntemi korunur; 2 yeni mod eklenir.

## Doğrulama
- `npm run build` temiz.
- Birim test (node): `afisTuru`/`etiketSec`/`afisAdres`/`fotoYerlesim` saf fonksiyonlar — senaryolarla.
- Canvas/Hibrit/A modları client-side → preview'da bir fiziki + bir online + çok katılımcılı (5 ve 6 kişi) afiş görsel doğrulaması.
- Eğitmen formunda 3 alan kaydı + yeniden açınca yükleme.
