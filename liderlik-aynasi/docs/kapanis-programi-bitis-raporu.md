# Kapanış Programı — Bitiş Raporu

**Program:** Kampın son günü + kamp sonrası 90 gün (FAZ 0–6)
**Durum:** Tamamlandı. Kamp KAPALI; hiçbir otomatik satır ateşlenmedi.

## Ne yapıldı

Kamp (17–19 Temmuz 2026) kapanışından itibaren 90 günlük takip deneyimi, mevcut
görev-motoru ve orkestratör altyapısı üzerine kuruldu. Tüm zamanlama tek yerde:
`kamp_senaryosu` tablosu + `lib/orkestrator.ts`. Detaylı zaman çizelgesi:
[`sahne-senaryosu.md`](./sahne-senaryosu.md).

### FAZ 1 — Sahne Motoru (Gün 3 kapanış)
Emre'nin 11:40–13:10 kapanış eğitimi için canlı sahne akışı: sahne senaryosu +
telefon anları, kolektif veri hikâyesi, **PD2026 kolektif taahhüt** (`/ekran/pd2026`),
**canlı yolculuk sahnesi** (`/ekran/yolculuk`), **salon daveti** (`/salon-daveti`).

### FAZ 2 — Kamp sonrası ritim
24 saat sessizlik + **72 saat protokolü** (Gün 5-6-7 mikro görevler) + iş-planı
karması + ödev paketleri (10/15 gün, Ağustos). Orkestratör 90 güne uzatıldı.

### FAZ 3 — Bağ ve dönem kapanışları
**Kamp arkadaşı hattı** (kalıcı ikili/üçlü + haftalık çift-taraflı check-in,
`/rapor-10gun`) + **31 Temmuz mini-zirve** (İlk 10 Gün Raporu).

### FAZ 4 — Ağustos motoru
**40 Gün Halkası** (`/halka`) · **Ara Mühür Zinciri** (`/muhur-zinciri`, +30/+60/+90) ·
**Ağustos grup ödevi** (her takıma isimli) · **Reddi Kutla Ligi** (`/red-ligi`, En Cesur 10).

### FAZ 5 — Eylül kanıt ayı
**Eylül kanıt görevleri** (Gün 46/53/60) · **Eylül Aynası** mini-360 (`/eylul-aynasi`) ·
**Cascade kiti** (`/cascade`) · **İş Verisi Köprüsü** (`/is-verisi`).

### FAZ 6 — Admin otomasyonu
`/admin/kapanis`: **Pazartesi komuta raporu** (haftalık + adminlere push) ·
**Churn müdahale merdiveni** (4 basamak) · **Eylül kapısı karar panosu** (devam/izle/risk).

## PR'lar (hepsi merged)

| Faz | PR | Konu |
|---|---|---|
| 3 | #561 | Kamp arkadaşı hattı + 31 Temmuz mini-zirve |
| 4.1–4.3 | #562 | 40 gün halkası + ara mühür zinciri + Ağustos grup ödevi |
| 4.4 | #563 | Reddi Kutla Ligi |
| 5 | #564 | Eylül kanıt ayı (kanıt görevleri + Eylül Aynası + cascade + iş verisi) |
| 6 | #565 | Admin otomasyonu (pazartesi raporu + churn + Eylül kapısı) |
| fix | #566 | Reset orkestratör çağına taşındı + bayat ayna_baslangic temizlendi |

## Migration'lar (canlıya uygulandı)

`0095`–`0096` kamp arkadaşı · `0097` reddi kutla · `0098` muhur zinciri ·
`0099` Ağustos grup ödevi · `0100` Eylül (eylul_aynasi + is_verisi) ·
`0101` pazartesi rapor · `0102` reset sertleştirme.

## Güvenlik / açılış durumu

- **`ayna_aktif = false`** — ana şalter kapalı; orkestratör susuyor.
- **`ayna_baslangic = null`** — testten kalan bayat tarih temizlendi (fix #566).
- **49 senaryo satırı `bekliyor`, 0 ateşlenmiş.** Takım/dalga/kilit yok.
- Kamp yalnız `/admin/ayna-direktoru` → "Kampı Başlat" ile açılır. O ana kadar
  hiçbir katılımcıya otomatik mesaj gitmez.

## Prova (güvenlik denetimi) bulguları — giderildi

1. **Bayat `ayna_baslangic`** (test artığı) "Kampı Başlat"ta yanlış gün sayımına +
   geçmiş-vadeli satırların toplu ateşlenmesine yol açabilirdi → canlıdan silindi.
2. **Reset senaryoyu/bayrakları sıfırlamıyordu** (fonksiyon FAZ 9'dan eskiydi) →
   `yeni_kamp_hazirla()` sağlamlaştırıldı: `kamp_senaryosu` `bekliyor`'a çekilir,
   orkestratör bayrakları + FAZ 1-6 tabloları temizlenir.

## Doğrulama

- `tsc --noEmit` temiz, `eslint` temiz (her faz PR'ında).
- Netlify deploy preview her PR'da yeşil.
- Fonksiyon eylem_hedef'lerinin tümü `FONKSIYONLAR` kaydında mevcut (orphan yok).
