-- 90 GÜN PROTOKOLÜ · P10 Pazar Karnesi — haftalık 3 sayı (davet/görüşme/takip).
-- Kamp arkadaşına tanıklık raporu bu kayıttan üretilir. Additive; RLS deny-all.
create table if not exists public.pazar_karnesi (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(id),
  hafta date not null,
  davet integer not null default 0,
  gorusme integer not null default 0,
  takip integer not null default 0,
  created_at timestamptz not null default now(),
  unique (participant_id, hafta)
);
create index if not exists pazar_karnesi_pid_idx on public.pazar_karnesi (participant_id, hafta);
alter table public.pazar_karnesi enable row level security;
