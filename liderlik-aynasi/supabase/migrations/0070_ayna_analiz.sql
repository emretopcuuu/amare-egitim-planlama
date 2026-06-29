-- AYNA'NIN ANALİZLERİ — kişiye dair zaman içinde biriken, kendi klon sesiyle
-- okunan, dönen ayna + Star Wars akışıyla sunulan analizler.
-- 4 aşama: kamp öncesi → 1. akşam → 2. akşam (gece) → kamp çıkışı.
-- Her aşama TEK satır; üst üste YAZILMAZ (ardışık liste olarak gösterilir).
-- "Yeniden değerlendir" hakkı: kişi sağlıklı bulmazsa, SEBEBİNİ yazarak
-- aşama başına BİR kez yeniden ürettirebilir (yeniden_kullanildi ile kilitlenir).

create table if not exists public.ayna_analiz (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(id) on delete cascade,
  asama text not null check (asama in ('kamp_oncesi', 'aksam_1', 'aksam_2', 'cikis')),
  metin text not null,
  ses_path text,
  yeniden_sebep text,
  yeniden_kullanildi boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (participant_id, asama)
);

create index if not exists ayna_analiz_participant_idx
  on public.ayna_analiz (participant_id, created_at);

-- Derinlemesine savunma: RLS açık ama sıfır policy (anon/authenticated deny-all).
-- Tüm erişim yalnız sunucu service-role ile.
alter table public.ayna_analiz enable row level security;
revoke all on public.ayna_analiz from anon, authenticated;
