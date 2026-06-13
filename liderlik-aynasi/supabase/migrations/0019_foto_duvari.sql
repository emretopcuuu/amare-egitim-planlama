-- FOTOĞRAF ANI DUVARI: katılımcılar an yakalar; moderasyondan geçince ortak
-- duvarda ve büyük ekranda görünür. Büyük ekran herkese açık olduğundan
-- yalnız 'approved' gösterilir. Tüm erişim sunucu üzerinden; deny-all.
create table public.photos (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(id) on delete cascade,
  path text not null,
  caption text,
  status text not null default 'pending' check (status in ('pending','approved','hidden')),
  created_at timestamptz not null default now()
);

create index photos_status_idx on public.photos(status, created_at desc);
create index photos_participant_idx on public.photos(participant_id);

alter table public.photos enable row level security;
revoke all on public.photos from anon, authenticated;
