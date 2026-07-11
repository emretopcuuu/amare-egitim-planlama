-- AYNA karakteri Faz 4 — KAMP RADYOSU: günde iki yayın (sabah 07:30 tahmin +
-- program, akşam 21:30 dedikodu bülteni + bahis skoru + tahmin yüzleşmesi).
-- Üretim yayından ~20 dk önce tetiklenir (tik); unique(tarih,slot) tekrarlı
-- tikleri idempotent yapar. AI/TTS düşerse şablon metin/salt-metin fallback.
create table if not exists public.radyo_yayin (
  id uuid primary key default gen_random_uuid(),
  tarih date not null,
  slot text not null check (slot in ('sabah','aksam')),
  gun int,
  metin text not null,
  -- Sabah yayınındaki iddialı tahmin (akşam yüzleşmesi için saklanır).
  tahmin text,
  ses_path text,
  durum text not null default 'hazir' check (durum in ('hazir','yayinda')),
  created_at timestamptz not null default now(),
  yayinlanan_at timestamptz,
  unique (tarih, slot)
);
alter table public.radyo_yayin enable row level security;
comment on table public.radyo_yayin is
  'AYNA Kamp Radyosu yayınları (Faz 4). RLS deny-all: yalnız servis rolü.';
