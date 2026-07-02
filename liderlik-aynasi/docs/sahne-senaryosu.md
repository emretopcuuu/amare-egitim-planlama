# Sahne Senaryosu — Kampın Son Günü + Kamp Sonrası 90 Gün

> Bu belge, kapanış programının (Kampın son günü + 90 günlük takip) **canlı sahne
> akışını** ve **otomatik orkestratör zaman çizelgesini** tek yerde toplar. Amaç:
> Emre'nin Gün 3 kapanış eğitimini uygularken hangi ekranın ne zaman açılacağını
> ve kamp sonrası 90 günde AYNA'nın kendiliğinden ne yapacağını net görmek.

## 0. Kimin neyi kontrol ettiği

- **Ana şalter:** `ayna_aktif` (settings). `false` → AYNA uyur, hiçbir otomatik
  satır ateşlenmez. `/admin/ayna-direktoru`'dan "Kampı Başlat" ile `true` olur ve
  o an `ayna_baslangic` yazılır (Gün 1 = o an).
- **Sahne kontrolü:** `/admin/sahne` + `/admin/sahne-kisi` — sahnedeki kişiyi ve
  sahne anlarını admin elle tetikler.
- **Otomatik akış:** `lib/orkestrator.ts` (`orkestratoduIsle`) — her `/api/tik`'te
  (Supabase pg_cron, 5 dk) zamanı gelmiş `kamp_senaryosu` satırlarını **idempotent**
  ateşler. Göreli zaman `ayna_baslangic`'tan hesaplanır.

---

## 1. GÜN 3 — Kapanış Sahnesi (Emre, 11:40–13:10)

Canlı, elle yönetilen sahne. Sıra aşağıdaki gibidir; her adım bir ekran/eylemle
eşleşir.

| # | An | Ekran / Eylem | Not |
|---|----|----|-----|
| 1 | **Sahne senaryosu + telefon anları** | `/admin/sahne-kisi` ile sahnedeki kişi seçilir; salon telefonlarında o ana özel kart | Kürsüde biri varken AYNA telefon titretmez (sahne sessizliği) |
| 2 | **Kolektif veri hikâyesi** | `/ekran` mozaik + kümülatif sayılar (gözlem, teslim, fiero, zincir, altın, salon daveti) | Salonun 3 günde ne ürettiğini tek karede gösterir |
| 3 | **PD2026 kolektif taahhüt** | `/ekran/pd2026` — herkesin `hedef.hedef_rutbe` hedefleri toplulaştırılır | "Bu salon 2026'da nereye gidiyor?" |
| 4 | **Canlı yolculuk sahnesi** | `/ekran/yolculuk` — kişilerin kamp boyu dönüşümü | Before/after anlatısı |
| 5 | **Salon daveti** | Katılımcı `/salon-daveti` — bir isme AYNA taslağıyla davet | Sistem mesaj GÖNDERMEZ; kişi kendi WhatsApp'ından atar |

Gün 3 · 13:00'te orkestratör **`kapanis_sessizlik_basla`** satırını ateşler →
`gorev_uretimi_durduruldu = true`. Böylece kapanıştan sonra 24 saat AYNA susar.

---

## 2. KAMP SONRASI 90 GÜN — Otomatik Orkestratör Zaman Çizelgesi

Tüm satırlar `ayna_baslangic`'a göredir (Gün 1 = kampın başlatıldığı gün).
Kamp 3 gündür (Gün 1–3); Gün 4+ kamp sonrasıdır. **Hepsi kamp başlayana dek
`bekliyor`.**

### Kamp içi mekanikler (Gün 1–3)

| Gün · Saat | Olay | Eylem |
|---|---|---|
| 1 · 10:00 | Altın görev açılır | `altin_gorev_acik` |
| 1 · 14:00 | İki kapı açılır | `iki_kapi_acik` |
| 2 · 09:00 | Johari çapraz | `johari_capraz_acik` |
| 2 · 10:00 | Tanık görevi | `tanik_gorevi_acik` |
| 2 · 11:00 | Mini konsey | `mini_konsey_acik` |
| 2 · 16:00 | Tahmin sapması | `tahmin_sapmasi_acik` |
| 2 · 20:00 | Kanıt garantisi | `kanit_garantisi_acik` |
| 3 · 09:00 | Kamp zinciri | `kamp_zinciri_acik` |
| 3 · 12:00 | Küme görevi | `kume_gorev_acik` |
| 3 · 13:00 | **24 saat sessizlik başlar** | `gorev_uretimi_durduruldu = true` |

### Geçiş ve ilk hafta (Gün 4–7)

| Gün · Saat | Olay | Eylem |
|---|---|---|
| 4 · 09:00 | Pazartesi komuta raporu (adminlere) | fonksiyon `pazartesi_rapor` |
| 4 · 10:00 | Kamp arkadaşı ata | fonksiyon `kamp_arkadasi_ata` |
| 5 · 09:00 | Yolculuk moduna geç | `sistem_modu = yolculuk` |
| 5 · 09:00 | Sessizlik biter | `gorev_uretimi_durduruldu = false` |
| 5–7 · 09:00 | 72 saat protokolü (3 mikro görev) | `p72_gun1/2/3` |

### İlk ay (Gün 10–32)

| Gün · Saat | Olay | Eylem |
|---|---|---|
| 10 · 09:00 | 10. gün ödevi | `odev_10gun` |
| 11/18/25 · 09:00 | Pazartesi raporu | `pazartesi_rapor` |
| 11/18/25 · 10:00 | Kamp arkadaşı hatırlatma | `kamp_arkadasi_hatirlat` |
| 15 · 09:00 | 15. gün ödevi + İlk 10 Gün Raporu push (`/rapor-10gun`) | `odev_15gun` + `mini_zirve` |
| 31 · 10:00 | Ara mühür +30 açılır | `muhur_plus30_acik` |
| 31 · 11:00 | İlk ara mühür çağrısı (`/muhur-zinciri`) | push |
| 32 · 09:00 | Ağustos bireysel ödev + Pazartesi raporu | `agustos_odev` + `pazartesi_rapor` |

### Ağustos motoru (Gün 33–45)

| Gün · Saat | Olay | Eylem |
|---|---|---|
| 33 · 10:00 | Ağustos grup ödevi (her takıma isimli) | `agustos_grup_odev` |
| 39 · 09:00 | Pazartesi raporu | `pazartesi_rapor` |
| 42 · 09:00 | 40 Gün Halkası push (`/halka`) | `halka40` |
| 45 · 09:00 | Eylül kanıt modu açılır | `eylul_kanit_modu` |
| 45 · 20:00 | Reddi Kutla Ligi — En Cesur 10 (`/red-ligi`) | push |

### Eylül kanıt ayı (Gün 46–62)

| Gün · Saat | Olay | Eylem |
|---|---|---|
| 46 · 09:00 | Eylül kanıt görevi 1 + Pazartesi raporu | `eylul_kanit1` + `pazartesi_rapor` |
| 46 · 12:00 | İş Verisi Köprüsü çağrısı (`/is-verisi`) | push |
| 53 · 09:00 | Eylül kanıt görevi 2 + Pazartesi raporu | `eylul_kanit2` + `pazartesi_rapor` |
| 60 · 09:00 | Eylül kanıt görevi 3 + Pazartesi raporu | `eylul_kanit3` + `pazartesi_rapor` |
| 61 · 10:00 | Ara mühür +60 açılır + çağrı | `muhur_plus60_acik` + push |
| 62 · 10:00 | Eylül Aynası çağrısı (`/eylul-aynasi`) | push |

### Kapanış (Gün 89–90)

| Gün · Saat | Olay | Eylem |
|---|---|---|
| 89 · 10:00 | Ara mühür +90 açılır + son çağrı | `muhur_plus90_acik` + push |
| 90 · 10:00 | Dalga 4 daveti | `dalga4` push |

---

## 3. Admin karar yüzeyleri (kamp sonrası)

`/admin/kapanis` (Kamp Komuta → 🚪 Kapanış):
- **Pazartesi Komuta Raporu** — haftalık kohort sağlığı (aktif/sessiz/kıvılcım/
  ara mühür/iş verisi). Ayrıca her post-camp pazartesi 09:00 adminlere bildirilir.
- **Churn Müdahale Merdiveni** — sessizlik gününe göre 4 basamak (aktif / hatırlat /
  akran kurtarma / elle ara), en riskliden en aktife.
- **Eylül Kapısı Karar Panosu** — aktiflik + iş verisi + Eylül Aynası puanı →
  önerilen karar (devam / izle / risk). Nihai kararı admin verir.

## 4. Güvenli açılış (operatör notu)

1. Gerekirse `/admin` → "Yeni kamp hazırla" (tüm katılımcı verisini + senaryo
   satırlarını + orkestratör bayraklarını sıfırlar; `ayna_baslangic`'i siler).
2. Katılımcılar yüklenince `/admin/ayna-direktoru` → **"Kampı Başlat"**. O an
   `ayna_aktif = true` ve `ayna_baslangic = şimdi`. Orkestratör Gün 1'den saymaya
   başlar.
3. Bu ana kadar hiçbir satır ateşlenmez — 49 satır `bekliyor` durur.
