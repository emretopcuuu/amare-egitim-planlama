-- FAZ B — 90 GÜN TAKİP + DÜRTME. Söz mühürlendikten sonra kişi günlük "bugün
-- hedefime/sözüme yönelik bir adım attım mı?" check-in'i yapar. Atmayınca sistem
-- önce kişiyi, sonra ŞAHİTLERİ dürter; şahitler dürtebilir/arayabilir.
create table if not exists public.soz_takip (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(id) on delete cascade,
  gun date not null,
  yapildi boolean not null default true,
  notlar text,
  created_at timestamptz not null default now(),
  unique (participant_id, gun)
);
alter table public.soz_takip enable row level security;
revoke all on public.soz_takip from anon, authenticated;
create index if not exists soz_takip_pid_idx on public.soz_takip (participant_id, gun);

-- Dürtme günlüğü: kim kimi hangi tiple dürttü (şahit ya da sistem).
create table if not exists public.soz_durtme (
  id uuid primary key default gen_random_uuid(),
  sahibi uuid not null references public.participants(id) on delete cascade,    -- dürtülen
  gonderen uuid references public.participants(id) on delete set null,          -- şahit (null=sistem)
  tip text not null,                                                            -- hatirlatma | tesvik | arama
  mesaj text,
  created_at timestamptz not null default now()
);
alter table public.soz_durtme enable row level security;
revoke all on public.soz_durtme from anon, authenticated;
create index if not exists soz_durtme_sahibi_idx on public.soz_durtme (sahibi, created_at);

-- Eskalasyon throttle: aynı kişiyi/şahitleri tekrar tekrar dürtmeyelim.
alter table public.soz
  add column if not exists son_durtme_at timestamptz,
  add column if not exists son_tanik_uyari_at timestamptz;
