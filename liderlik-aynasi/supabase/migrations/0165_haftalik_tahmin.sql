-- [C#27] HAFTALIK TAHMİN — Pazartesi kişi "bu hafta kaç görüşme?" tahminini girer,
-- Pazar gerçekle yüzleşir. Kişisel hedef tutturma (satış baskısı değil, kendi
-- sözüyle yüzleşme). Kişi başına hafta başına tek tahmin.
create table if not exists haftalik_tahmin (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references participants(id) on delete cascade,
  hafta_basi date not null, -- o haftanın Pazartesi'si (YYYY-MM-DD)
  tahmin int not null,
  created_at timestamptz not null default now(),
  unique (participant_id, hafta_basi)
);
alter table haftalik_tahmin enable row level security;
