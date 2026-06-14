# Liderlik Aynası — Faz Modeli & Operasyon El Kitabı

Bu uygulama iki katmanlı bir dönüşüm sistemidir:

- **Ateşleme (kimlik):** Kişi kampa bir iç engelle gelir; kanıtla çürütülür, yeni
  bir öz-cümle yazar. Tek seferlik, cerrahi.
- **Motor (davranış):** Gameful sistem (akış-zorluğu, anlık geri bildirim, Fiero,
  Fun Failure, churn) o yeni cümleyi 90 gün ayakta tutar.

Ateşleme olmadan motor sadece aktivite oyunudur; motor olmadan ateşleme 4. gün
geri teper. İkisi birlikte: kalıcı dönüşüm + iş hareketi.

> **SDT güvenliği:** Her görev/ödül kişinin KENDİ nedenine (Pusula) bağlı
> olduğu için sistem özerklik-destekli kalır — aşırı-gerekçelendirme tuzağına
> düşmez. Gönüllülük gerçek olmalı; "why" bir suçluluk sopası değildir.

---

## Fazlar

### FAZ 0 — Pusula (kamp öncesi hafta, online PD101)
Kişi app'i kurar, **Nedenler çalışmasını** yapar: 10 öncelik (madde madde form)
→ AI derinleşme sohbeti (eleme → boşluk → **iç engel**). Çıktı `pusula`'ya
mühürlenir; bundan sonraki TÜM AI üretimi bu özeti baz alır.

- **Aç:** Admin → Kritik Kontroller → FAZ 0 → "Pencereyi Aç" (`pusula_acik`).
- **Oda QR:** Aynı yerde "Oda QR kodu" ayarla → katılımcı `…/ac?k=KOD` ile
  kampı açar (`camp_unlocked_at`).
- Pencere kapalıyken sistem mevcut davranışı birebir korur.

### FAZ 1 — Boşluk Anı (Gün 3 zirvesi)
Pusulasını kuran kişi, iç engelini kamptaki **gerçek + anonim** kanıtla
(akran yorumları, AYNA görev gözlemleri, takdirler) çürütür; kendi yeni cümlesini
yazar (`bosluk_ani.yeni_cumle`).

- **Aç:** Admin → Kritik Kontroller → FAZ 1 → "Boşluk Anı'nı Aç" (`bosluk_acik`).
- **Derinlik panosu:** Aynı kartta "kim kanıtsız?" — açmadan önce sıfırla.
  Kanıtsız kişi = içi boş an riski.
- **Kural:** Kanıt gerçek olmalı, AI uydurma yapmaz.

### FAZ 2 — İlk 72 Saat / Re-entry (20–31 Temmuz)
Yeni cümle en kırılgan dönem. Savunma otomatik:
- Yolculuk görevleri yeni cümleyi **yaşatan** saha adımları olarak üretilir.
- Churn radarı nüks sezince yeni cümleyi **geri çalar** (reconsolidation bakımı).
- **Ödev paketi:** Admin → Tüm araçlar → "Ödev Gönder" — 10/15 gün, Ağustos
  ödevlerini tüm katılımcılara gönderir (görev olarak düşer, AYNA puanlar).

### FAZ 3 — Alışkanlık / Gameful motor (Ağustos)
Motorun çoğu zaten çalışır: akış-zorluğu (`davranis.ts`), Fiero/kıvılcım,
haftalık momentum, churn ritmi, akran check-in. Eklenen tek yeni mekanik:
- **Reddi Kutla** (`/red`): Go-for-No — ret bir kayıp değil Tecrübe Puanı.
  Yeni cümle reti kimlikten ayırdığı için ilk kez gerçekten çalışır.

### FAZ 4 — Test & Analiz Kapısı (Eylül)
`/admin/analiz` — üç ekseni **ayrı** ölç:
1. **Kimlik:** pusula + yeni cümle tamamlanma, kanıtsız sayısı.
2. **Davranış:** görev tamamlama %, churn riski, reddi kutla, momentum.
3. **İş:** dış kaynak (ciro/kayıt) — tek başına dönüşümü doğrulamaz.

**Kapı kuralı:** Yalnız bu kapıdan geçen şey ölçeklenir. Öldür / koru / düzelt.

> Dürüst uyarı: pilotların ~%40'ı işe yarar, ~%60'ı yeniden tasarım ister —
> bu normal ve iyi.

### FAZ 5 — Momentum & Kademe / Cascade (Eylül–Aralık)
`/admin/analiz` alt tablosu: **takım kırılımı**. Her lider kendi ekibinin
durumunu (pusula/yeni cümle/kanıtsız) görür. Liderler sistemi kendi ekiplerinde
işletmeye başlar — bu, "tüm Türkiye" ölçeğinin provasıdır.

### FAZ 6 — Tüm OneTeam (Eylül sonrası)
Kod değil **ölçek kararı**:
- Yalnız Eylül kapısından geçeni yaygınlaştır.
- **Yüksek-dokunuş katmanı** (Boşluk Anı kanıt kalitesi, görülme anı) app ile
  ölçeklenmez — liderler kendi ekiplerine **elden** taşır.
- **Motor katmanı** (Pusula, görev, churn, go-for-no, 90 gün) app ile ölçeklenir.
- Köprü: liderler hem **kanıt vakası** hem **eğitmen ordusu**.
- Ölçek riski: gönüllülük (baskı artar), fear-capture derinliği, kanıt kalitesi
  ölçekte bozulur — bunları liderler-operatör modeli telafi eder.

---

## Ayar referansı (settings)

| Key | Ne | Nereden |
|-----|-----|---------|
| `pusula_acik` | FAZ 0 penceresi | Kritik Kontroller → FAZ 0 |
| `kamp_kilit_kodu` | Oda QR sırrı | Kritik Kontroller → FAZ 0 |
| `bosluk_acik` | FAZ 1 Boşluk Anı | Kritik Kontroller → FAZ 1 |
| `prova_modu` | Test bandı (tüm sayfalarda kırmızı şerit) | Kritik Kontroller |
| `reports_visible` | Ayna raporları | Kritik Kontroller → Ayna Anı |
| `sistem_modu` | kamp ↔ yolculuk | (AYNA direktörü) |

## Re-entry / ölçüm verisi

- `pusula` / `pusula_mesajlar` — Nedenler çalışması.
- `bosluk_ani` — demolisyon + yeni cümle.
- `redler` — Go-for-No sayacı.
- `audit_log` — kritik admin eylemleri.
- Analiz: `/admin/analiz` (Eylül kapısı + cascade).
