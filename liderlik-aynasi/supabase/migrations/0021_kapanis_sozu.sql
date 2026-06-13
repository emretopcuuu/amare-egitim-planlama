-- KAPANIŞ SÖZÜ: kampın sonunda her lider iki somut sayıya bağlanır —
-- Temmuz (19-31) kişisel kayıt + Ağustos toplam görüşme (min 100). Kendi
-- sesiyle söz + 90 gün ilerleme takibi. Tüm erişim sunucu üzerinden; deny-all.
create table public.pledges (
  participant_id uuid primary key references public.participants(id) on delete cascade,
  temmuz_kayit int not null check (temmuz_kayit >= 0),
  agustos_gorusme int not null check (agustos_gorusme >= 100),
  voice_path text,
  kayit_yapilan int not null default 0 check (kayit_yapilan >= 0),
  gorusme_yapilan int not null default 0 check (gorusme_yapilan >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.pledges enable row level security;
revoke all on public.pledges from anon, authenticated;
