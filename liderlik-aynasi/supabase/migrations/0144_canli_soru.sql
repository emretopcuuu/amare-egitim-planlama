-- KAPANIŞ Faz B — CANLI SORU: Emre'nin kapanış eğitimi sırasında salona canlı
-- soru sorma mekanizması. İki tip:
--   'nabiz' — hızlı nabız sorusu: seçenekli, /ekran'da 15 sn canlı toplam.
--   'tohum' — "Emre'nin Sorusu": açık uçlu; her kişinin cevabı verdiği SÖZ'ün
--             tohumu olur (Faz C sozSekillendir bu cevabı okur).
-- Aynı anda her tipten en çok BİR 'acik' soru olur (kodla güvence). Yanıtlar
-- unique(soru,katılımcı) ile idempotent.
create table if not exists public.canli_soru (
  id uuid primary key default gen_random_uuid(),
  soru text not null,
  tip text not null check (tip in ('nabiz','tohum')),
  -- nabız için seçenek listesi (jsonb string[]); tohum'da null (açık uçlu).
  secenekler jsonb,
  durum text not null default 'acik' check (durum in ('acik','kapali')),
  created_at timestamptz not null default now(),
  kapandi_at timestamptz
);
alter table public.canli_soru enable row level security;
comment on table public.canli_soru is
  'Kapanış canlı soru (nabız/tohum). RLS deny-all: yalnız servis rolü.';

create table if not exists public.canli_soru_yanit (
  id uuid primary key default gen_random_uuid(),
  soru_id uuid not null references public.canli_soru(id) on delete cascade,
  participant_id uuid not null,
  yanit text not null,
  created_at timestamptz not null default now(),
  unique (soru_id, participant_id)
);
alter table public.canli_soru_yanit enable row level security;
create index if not exists canli_soru_yanit_soru_idx on public.canli_soru_yanit (soru_id);
comment on table public.canli_soru_yanit is
  'Canlı soru yanıtları (tohum yanıtı = söz tohumu). RLS deny-all: yalnız servis rolü.';
