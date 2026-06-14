-- #2 Anı Duvarı etkileşimi: fotoğraflara kalp (beğeni) + yorum.
-- Deny-all RLS (tüm erişim sunucu service_role üzerinden).
create table if not exists public.foto_begeni (
  id uuid primary key default gen_random_uuid(),
  photo_id uuid not null references public.photos(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (photo_id, participant_id)
);
alter table public.foto_begeni enable row level security;
create index if not exists foto_begeni_photo on public.foto_begeni (photo_id);

create table if not exists public.foto_yorum (
  id uuid primary key default gen_random_uuid(),
  photo_id uuid not null references public.photos(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  yorum text not null,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.foto_yorum enable row level security;
create index if not exists foto_yorum_photo on public.foto_yorum (photo_id, created_at);
