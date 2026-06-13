-- TAKDİR DUVARI (kudos): puanın yanında insana kısa pozitif not.
-- Tüm erişim sunucu (service_role) üzerinden; anon/authenticated deny-all.
create table public.kudos (
  id uuid primary key default gen_random_uuid(),
  from_id uuid not null references public.participants(id) on delete cascade,
  to_id uuid not null references public.participants(id) on delete cascade,
  message text not null,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now(),
  constraint kudos_kendine_olmaz check (from_id <> to_id)
);

create index kudos_to_idx on public.kudos(to_id);
create index kudos_from_idx on public.kudos(from_id);

alter table public.kudos enable row level security;
revoke all on public.kudos from anon, authenticated;
