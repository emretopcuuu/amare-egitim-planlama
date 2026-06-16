# Liderlik Aynası — Ölçek & Göç Mimarisi Planı

> Hedef: "3 günlük kamp" prototipinden, on binlerce kullanıcılı **sürekli açık bir
> platforma** taşınabilir bir altyapı. Karar ekseni: **maliyet öngörülebilirliği +
> arka plan/AI yüklerine uygunluk** (sadece "kolay deploy" değil).
> İlke: zaten Pro ödenen servislerde topla (Railway, Cloudflare, Supabase).

## 0. Hedef mimari

```
                 ┌─────────────────────────────────────────┐
   Kullanıcı ──► │ Cloudflare  (DNS · CDN · cache · WAF/DDoS)│
                 │  ayna.oneteamglobal.ai                    │
                 └───────────────┬─────────────────────────┘
                                 │ (proxied)
                 ┌───────────────▼─────────────────────────┐
                 │ Railway                                   │
                 │  • web: Next.js (standalone Node server)  │
                 │  • worker: AI/email/WhatsApp kuyruğu      │
                 │  • cron: dalga/bildirim zamanlaması       │
                 │  • redis: kuyruk (BullMQ)                 │
                 └───────┬───────────────────────┬──────────┘
                         │                        │
              ┌──────────▼─────────┐   ┌──────────▼──────────┐
              │ Supabase (Postgres)│   │ Cloudflare R2       │
              │  + connection pooler│   │  ses/video/foto     │
              │  + Storage→R2 göçü  │   │  (egress ~bedava)   │
              └────────────────────┘   └─────────────────────┘

   Dış servisler: ElevenLabs · Higgsfield · OpenAI/Anthropic/Gemini (OpenRouter)
                  · Postmark/Resend · Twilio WhatsApp
```

**Neden bu şekil:**
- **Railway (uzun-ömürlü Node sunucu)** = öngörülebilir maliyet (container, serverless sürpriz faturası yok), cold-start yok, tam Node uyumu, ve **AI pipeline'ları için doğru ev** (uzun süren işler + kuyruk + cron aynı yerde).
- **Cloudflare önde** = ucuz egress, global cache, WAF/DDoS; domain zaten burada.
- **Supabase pooler** = uzun-ömürlü sunucu Postgres bağlantı havuzunu temiz tutar (serverless'taki bağlantı tükenmesi derdi yok).
- **R2** = medya egress'i ölçekte en büyük gizli maliyet; R2'de egress bedava.

---

## Faz 0 — Hazırlık (risksiz, Vercel/Netlify'ı bozmaz) ✅ YAPILDI

> `output: standalone` + Dockerfile + `/api/saglik` + `railway.json` eklendi.
> Standalone yalnız self-host build'inde açık (Vercel/Netlify kendi pipeline'ı).

Kod tarafı taşınabilir hale getirilir; mevcut deploy'lar çalışmaya devam eder.

1. **`next.config.ts` → `output: "standalone"`** (self-host için ince Node imajı).
2. **`Dockerfile`** (çok aşamalı: deps → build → `node server.js`), `.dockerignore`.
3. **Healthcheck route** `GET /api/saglik` → `{ ok: true }` (Railway probe).
4. **Env envanteri** tek listede toplanır (aşağıda). Sırlar hiçbir yere commit'lenmez.

Bu faz bittiğinde uygulama herhangi bir Node ortamında `docker run` ile ayağa kalkar — ama hâlâ Vercel/Netlify'da da çalışır. Geri dönüş bedava.

---

## Faz 1 — Railway'e app'i al

1. Railway'de **proje** + **web servisi**: kaynak GitHub repo, **Root Directory = `liderlik-aynasi`**, Dockerfile build.
2. **Env değişkenleri** Railway'e (Faz 0 listesi).
3. **Healthcheck** = `/api/saglik`; min 1 replika, autoscale tavanı belirle.
4. Geçici Railway URL'inde tüm akışı test et (giriş, dalga, rapor, ses ritüeli, mühür, admin).
5. Henüz domaini taşıma — Vercel/Netlify canlı kalsın (paralel doğrulama).

## Faz 2 — Cloudflare'i öne al

1. `ayna.oneteamglobal.ai` → Railway servisine **CNAME** (proxied/turuncu).
2. **Cache kuralları**: statik varlıklar (`/_next/static/*`, görseller) uzun TTL; HTML/SSR bypass; API `no-store`.
3. **WAF + rate limit** (giriş/`/api/giris` brute-force koruması zaten DB'de var; Cloudflare ikinci kalkan).
4. SSL "Full (strict)".
5. Domain Railway'e işaret edince **Vercel'i emekliye ayır** (önce production alias'ı kaldır, birkaç gün sonra projeyi sil).

## Faz 3 — Supabase bağlantı havuzu  *(büyük ölçüde N/A — kod değişikliği yok)*

> **Doğrulandı:** Uygulama yalnız `supabase-js` (REST/PostgREST, HTTP) kullanıyor;
> doğrudan Postgres bağlantısı (pg/Prisma) tutmuyor. Yani serverless'taki "bağlantı
> tükenmesi" derdi burada yok ve **pooler için kod değişikliği gerekmez.**

1. İleride doğrudan SQL/analitik için `pg` eklenirse pooler (transaction mode, 6543) şart.
2. Ölçekte tek yapılacak: Supabase **compute add-on**'u büyüt (Pro → daha büyük instance) — kullanıcı eğrisine göre.

## Faz 4 — AI iş kuyruğu (en kritik ölçek adımı)

Bugün ağır işler (ses klonlama/seslendirme, video, LLM puanlama) istek içinde senkron çağrılıyor → ölçekte timeout + maliyet patlaması riski.

1. **Railway Redis** + **BullMQ** worker servisi.
2. Pipeline'ları kuyruğa al: `ses-rituel`, `mektup üretimi`, `Higgsfield video`, `görev puanlama`, `email/WhatsApp gönderimi`.
3. İdempotent job'lar + **retry/backoff** + **cache** (aynı içeriği iki kez üretme — kişi başı ses/mektup bir kez).
4. Kullanıcıya "hazırlanıyor" durumu (zaten `voice_profiles.status`, `video_status` desenleri var — kuyruk bunları besler).

## Faz 5 — Medya R2'ye

1. Yeni yüklemeler **Cloudflare R2**'ye (S3-uyumlu); imzalı URL deseni aynen korunur.
2. Mevcut Supabase Storage içeriği R2'ye **toplu kopya** (bir kerelik script).
3. `lib/supabase` storage çağrıları bir **depolama soyutlamasının** arkasına alınır (R2/Supabase seçilebilir) → tek noktadan geçiş.
4. KVKK: ses/foto biyometrik; R2 bucket private + kamp sonu **silme job'u** korunur.

## Faz 6 — Cron'u taşı  *(route hazır; yalnız tetikleyici + env)*

> **Doğrulandı:** `/api/cron/olaylar` zaten `CRON_SECRET` Bearer korumasını destekliyor
> (yoksa açık çalışır). Kod değişikliği gerekmez.

- Bugün: `vercel.json` → `/api/cron/olaylar`. Vercel gidince bu tetikleyici çalışmaz.
- Yeni: **Railway cron servisi** (ya da Cloudflare **Cron Trigger**) aynı endpoint'i
  `Authorization: Bearer $CRON_SECRET` ile çağırır.
- `CRON_SECRET` env'ini ayarla; sıklığı ihtiyaca göre belirle (dalga otomasyonu, bildirim pencereleri).

---

## Çapraz kesen: gözlemlenebilirlik & güvenlik

- **Sentry** (eski app'te zaten var) yeni app'e de — hata + performans izleme ölçekte şart.
- **Yapılandırılmış log** + Railway metrikleri; AI maliyet sayaçları (job başına token/credit).
- Deny-all RLS + service-role-yalnız-sunucu deseni **host'tan bağımsız** — aynen korunur.
- Sırlar: Railway/Cloudflare secret store; repoda asla ham PII / anahtar yok.

## Maliyet sıralaması (on binler ölçeğinde)

1. **AI API** (ElevenLabs/Higgsfield/LLM) — kişi başı; **cache + batch + kuyruk** ile zapt edilir. En büyük kalem.
2. **Medya egress** — R2 ile ~sıfırlanır.
3. **Supabase compute** — instance büyütme.
4. **Email/WhatsApp** — gönderim hacmiyle doğrusal.
5. **Hosting (Railway+CF)** — öngörülebilir, en küçük kalem.

## Env envanteri (tek liste)

`SUPABASE_URL` · `SUPABASE_SERVICE_ROLE_KEY` · `NEXT_PUBLIC_SUPABASE_URL` ·
`NEXT_PUBLIC_SUPABASE_ANON_KEY` · `SUPABASE_DB_URL` (pooler) · `SESSION_SECRET` ·
`ADMIN_PASSWORD` · `NEXT_PUBLIC_VAPID_PUBLIC_KEY` · `VAPID_PRIVATE_KEY` ·
`ELEVENLABS_*` · `HIGGSFIELD_*` (creds + karakter model) · `POSTMARK_*` / `RESEND_*` ·
`TWILIO_*` · `ANTHROPIC_API_KEY` / `OPENAI_*` / `OPENROUTER_*` · `R2_*` (Faz 5) ·
`CRON_SECRET` (Faz 6).

## Risk & geri dönüş

- Her faz **bağımsız ve geri alınabilir**; domain taşınana dek (Faz 2) Vercel/Netlify canlı.
- Faz 0–1 hiçbir kullanıcıyı etkilemez (paralel ortam).
- Tek "tek-yönlü" an: domaini Railway'e çevirmek (Faz 2) — ama DNS geri alınabilir.

## Önerilen sıra

**Faz 0 (hazırlık) → 1 (Railway paralel) → 4 (kuyruk; ölçeğin kalbi) → 2 (domain) →
3 (pooler) → 5 (R2) → 6 (cron).**
Kuyruğu (Faz 4) erken yapmak mantıklı: asıl ölçek riski orada.

---

_Bu belge canlı bir plandır; her faz uygulandıkça güncellenir. İlk uygulanabilir
adım: **Faz 0** (standalone + Dockerfile + healthcheck) — risksiz, mevcut
deploy'ları bozmaz._
