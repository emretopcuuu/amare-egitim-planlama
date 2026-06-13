-- AKRAN İKİLİSİ: 90 günlük yolculuk için sorumluluk ortakları + haftalık
-- check-in mesajlaşması. Tüm erişim sunucu üzerinden; deny-all.
create table public.pairs (
  id uuid primary key default gen_random_uuid(),
  a_id uuid not null references public.participants(id) on delete cascade,
  b_id uuid not null references public.participants(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint pairs_farkli check (a_id <> b_id)
);

create index pairs_a_idx on public.pairs(a_id);
create index pairs_b_idx on public.pairs(b_id);

create table public.pair_messages (
  id uuid primary key default gen_random_uuid(),
  pair_id uuid not null references public.pairs(id) on delete cascade,
  from_id uuid not null references public.participants(id) on delete cascade,
  message text not null,
  created_at timestamptz not null default now()
);

create index pair_messages_pair_idx on public.pair_messages(pair_id, created_at);

alter table public.pairs enable row level security;
alter table public.pair_messages enable row level security;
revoke all on public.pairs from anon, authenticated;
revoke all on public.pair_messages from anon, authenticated;
