# Bağımsız Denetim (E1–E12) — Bitiş Raporu

**Kapsam:** Denetimin bulduğu 12 eksik. Kural: her madde branch → PR → `tsc` temiz →
squash-merge; migration hem repoda hem canlıda; **kamp AÇILMADI, hiçbir bayrak
ateşlenmedi**. Mevcut desenler kullanıldı — sıfırdan icat yok.

## Madde madde ne yapıldı

### Blok 1 — Kampa şart

- **E1 · Teknik Sigorta** (PR #569) — (a) `/admin/zirveye-hazirlik`: tüm Ayna
  Mektupları + sesleri toplu, idempotent ön-üretim, canlı N/29. (b) Orkestratör
  **ön-uçuş**: `kamp_senaryosu.on_kosul` (`raporlar_hazir`) — kritik satırdan 45 dk
  önce eksik varlıkları üretmeye başlar, 15 dk kala hâlâ eksikse admin'e push.
  (c) Service worker: reveal öncesi kişinin mektup sesini önbelleğe alır. *(mig 0104)*
- **E2 · İlk 72 Saat Kartı** (PR #570) — söz sonrası `/ilk-72-saat`: oyun planından 3
  mikro adım, kişi her adıma kendi saatini seçer → kişisel-zamanlı push (dakikalık
  cron `taahhut` satırlarını gönderir). *(mig 0105)*
- **E3 · Kolektif Söz Finali** (PR #571) — QR yüz yüze şahitlik (`/sahit`), 5 imza →
  mühür; son söz mühürlenince tüm telefonlarda titreşim + ekran parlaması (reduced-
  motion'da yalnız titreşim); `/ekran`'da "N/M söz mühürlendi" sayacı. *(migration yok)*
- **E4 · Görev Fragmanı** (PR #572) — teslim sonrası Fiero ekranında "Sıradaki: HH:MM ·
  İpucu: … 🔒" (program anı + kilitli ipucu). *(migration yok)*
- **E5 · Başladım push** (PR #573) — mevcut "Başladım" (started_at) + in-app fısıltı
  üstüne: fısıltı arkaplandaki telefona da PUSH gider (dakikalık cron, tek seferlik
  `cesaret_push` guard). Etiket "🎯 Şimdi yapıyorum". *(mig 0106)*
- **E6 · Görev Çek** (PR #574) — sessizleşip dönen kişiye (yeniden giriş basamağı 0)
  tek AI görevi yerine 3 kapalı kart; birini çeker, diğerleri söner. İki Kapı
  (`secim_grubu`/`kapi_etiket`/`/api/kapi-sec`) genelleştirildi. *(migration yok)*
- **E7 · Takım Çekimi** (PR #575) — skor zaten kıvılcım × tamamlama oranıydı (FAZ 7.7);
  `/ekran`'da "birlikte tamamlayan takım önde" vurgusu eklendi. *(migration yok)*
- **E8 · Kamp İçi Kayıp Radarı** (PR #576) — kamp modunda drift'te "seni özledik"
  WhatsApp'ı (duyuru şablonu, Twilio; webhook'a dokunulmadı; tek seferlik `wa_sent_at`)
  + `/admin/kayip-radari` (kim + sessizlik saati + önerilen insan dokunuşu). *(mig 0107)*
- **E9 · Fiero + sıfır borç** — **doğrulama**: Fiero sahnesi (PuanAçılışı: kıvılcım
  animasyonu + kas/skor halkası + prefers-reduced-motion) zaten tam; süresi dolan
  görev aktif listeden sessizce kalkıyor, geçmişte etiket "Kaçtı" (suçlayıcı değil).
  Kod değişikliği gerekmedi.

### Blok 2 — Kamp sonrasına kalabilir

- **E10 · Yolculuk karma** (PR #577) — yolculuk modunda görev teması artık sabit değil;
  hedeften (kariyer rütbesi + günlük saat) davet/takip/prova ağırlıkları türetilip
  görev üretim prompt'una enjekte edilir. *(migration yok)*
- **E11 · Eylül dış link** (PR #578) — kişi 3 kişiye tek kullanımlık (14 gün) link
  yollar; dış değerlendirici oturumsuz, anonim, KVKK onaylı doldurur; PII sızmaz
  (yalnız ad görünür). *(mig 0108)*
- **E12 · Kariyer senkron** (PR #579) — kariyer seviyeleri dış kaynaktan (amare, env
  soyutlu) ya da admin CSV ile senkronlanır; yalnız yükseliş + kutlama push'u; başka
  PII taşınmaz. *(migration yok)*
- **Reset sağlamlaştırma** (bu PR) — E2 `taahhut` + E11 `eylul_dis` `yeni_kamp_hazirla`'ya
  eklendi (yeni kampta bayat kalmasın). *(mig 0109)*

## Kamp günü kontrol listesine eklenenler

Operatörün (Emre) kamp günü aklında tutması gereken YENİ araçlar:

1. **Kapanıştan önce** `/admin/zirveye-hazirlik` → "Eksik olanları üret" (N/29 dolana
   dek). Orkestratör Gün 3 11:00'de bunu son kez kendisi de dener + eksikse uyarır.
2. **Kamp boyunca** `/admin/kayip-radari` → sessizleşenleri gör, önerilen insan
   dokunuşunu uygula. (Sistem WhatsApp'ı zaten atar; bu yüz yüze müdahale içindir.)
3. **Söz finalinde** katılımcılar `/sozum`'da QR gösterir; şahitler `/sahit`'ten okutur.
   `/ekran`'da mühür sayacı canlı akar; son söz mühürlenince salon senkron titrer.
4. **Söz sonrası** katılımcı `/ilk-72-saat` kartından 3 adımına saat seçer.
5. **Kamp sonrası (Eylül)** katılımcı `/eylul-aynasi`'ndan 3 kişiye dış değerlendirme
   linki yollayabilir; admin `/admin/kariyer-senkron`'dan (CSV) kariyerleri günceller.

## Güvenlik durumu (canlı, doğrulandı)

- Kamp **KAPALI** (`ayna_aktif=false`, `ayna_baslangic=null`).
- Migration 0104–0109 canlıda; senaryo satırlarının hepsi `bekliyor`, **0 ateşlenmiş**.
- Yeni public yüzey yalnız `/dis/[token]` (tek kullanım + 14 gün + KVKK); PII sızmaz.
