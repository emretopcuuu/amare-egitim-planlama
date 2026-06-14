-- #5 Günlük mikro check-in: kişi günde bir hangi liderlik özelliğini yaşadığını
-- işaretler (+ isteğe bağlı not). Deny-all RLS (tüm erişim sunucu service_role).
create table if not exists public.gunluk_checkin (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(id) on delete cascade,
  tarih date not null,
  trait_id smallint references public.traits(id),
  notu text,
  created_at timestamptz not null default now(),
  unique (participant_id, tarih)
);
alter table public.gunluk_checkin enable row level security;
create index if not exists gunluk_checkin_pid_tarih
  on public.gunluk_checkin (participant_id, tarih);
