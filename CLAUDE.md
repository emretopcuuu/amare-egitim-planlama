# Liderlik Aynası — Proje Hafızası (Claude için)

> Bu dosya her yeni Claude Code oturumunda otomatik okunur. Amaç: yeni bir oturumun
> (masaüstü veya mobil/web) projeyi, kararları ve çalışma kurallarını sıfırdan
> öğrenmeden devam edebilmesi. Önemli bir karar değişince burayı güncelle.

## Proje nedir

**Liderlik Aynası** — 3 günlük bir network marketing liderlik kampı için 360°
liderlik değerlendirme + kişisel gelişim uygulaması. ~29 aktif katılımcı.
Repo kökündeki eski Vite+Firebase uygulamasına **dokunulmaz**; bu uygulama
bağımsız olarak **`liderlik-aynasi/`** alt klasöründe yaşar.

- **Stack:** Next.js 14+ (App Router) + TypeScript + Tailwind
- **Deploy:** Netlify (production = `main` branch). Proje: `marvelous-pasca-fbfa40`.
  Canlı adres: `ayna.oneteamglobal.ai`
- **CI:** Gerçek/bloklayan CI **yok**. Sadece Netlify deploy preview (bloklamaz).
  Doğrulama için `cd liderlik-aynasi && npx tsc --noEmit` kullan.

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

- **KAMP AÇIK VE CANLI.** 29 katılımcı, Sapanca kampı. `ayna_baslangic =
  2026-07-03 ~09:10 İst` → Gün 1 = 3 Temmuz, Gün 2 = 4 Temmuz, Gün 3 = 5 Temmuz.
  Kilit kodu `SAPANCA2026`. Görev motoru (tik) aktif; insanlara görev düşüyor.
  **Merge edilen her şey doğrudan canlı kampı etkiler — ona göre dikkatli ol.**
- Senaryoda bekleyen özel olaylar: Gün 2 21:00 sesli mektup (`gun2_sesli_mektup_ac`),
  Gün 3 10:00 domino (`gun3_domino_ac`).

## Son tamamlanan işler

- Kariyer seviyeleri 8 basamağa düzeltildi (PR #313, merged).
- Ses Ritüeli'nden foto adımı kaldırıldı (PR #312, merged).
- Pusula kariyer formu: DB CHECK constraint 8 basamağa genişletildi
  (migration `0060_kariyer_8_basamak.sql`, canlıya uygulandı) + form sadeleştirildi
  ("şu anki" alanı en yüksek kariyeri de kapsar; "geçen ay hangi kariyerle bitirdin?")
  → PR #314.
