-- B3 — Grup foto-mozaiği. Her üye grubunun mozaiğine tek parça (foto) ekler.
-- Kişi başına tek parça (unique) — tekrar yüklerse günceller.
create table if not exists public.mozaik_parca (
  id uuid primary key default gen_random_uuid(),
  grup text not null,
  participant_id uuid not null references public.participants(id),
  foto_path text not null,
  created_at timestamptz not null default now(),
  unique (participant_id)
);
create index if not exists mozaik_parca_grup_idx on public.mozaik_parca (grup);
-- RLS: deny-all (diğer tablolarla aynı — tüm erişim service-role sunucu tarafı).
alter table public.mozaik_parca enable row level security;
