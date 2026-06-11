-- Faz 7: AYNA — yapay zekâ kamp direktörü.
-- missions: AYNA'nın verdiği kişiye özel görevler + AI puanlaması (üçüncü mercek).
-- push_subscriptions: PWA push abonelikleri.
-- schedule_items: gizemli kamp programı (AYNA parça parça açıklar).
-- 0002'deki default privileges revoke sayesinde yeni tablolar da anon'a kapalıdır;
-- yine de RLS açılır (savunma katmanı).

create table public.missions (
  id             uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(id) on delete cascade,
  trait_id       smallint references public.traits(id),
  kind           text not null check (kind in ('gozlem','cesaret','yansima','gizli','tahmin','soz')),
  title          text not null,
  body           text not null,
  issued_at      timestamptz not null default now(),
  due_at         timestamptz not null,
  status         text not null default 'pending'
                 check (status in ('pending','submitted','scored','expired')),
  response_text  text,
  responded_at   timestamptz,
  ai_score       smallint check (ai_score between 1 and 10),
  ai_comment     text,
  scored_at      timestamptz,
  spark_points   int not null default 0,
  reminded_at    timestamptz
);
create index idx_missions_participant on public.missions (participant_id, status);
create index idx_missions_status_due on public.missions (status, due_at);

create table public.push_subscriptions (
  id             uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(id) on delete cascade,
  endpoint       text not null unique,
  p256dh         text not null,
  auth           text not null,
  created_at     timestamptz not null default now()
);
create index idx_push_participant on public.push_subscriptions (participant_id);

create table public.schedule_items (
  id             uuid primary key default gen_random_uuid(),
  starts_at      timestamptz not null,
  title          text not null,
  location       text,
  teaser         text,
  reveal_minutes int not null default 60,
  revealed       boolean not null default false,
  created_at     timestamptz not null default now()
);
create index idx_schedule_starts on public.schedule_items (starts_at);

alter table public.missions           enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.schedule_items     enable row level security;

-- AYNA varsayılan olarak UYKUDA başlar: cron her 5 dk dürtse de
-- ayna_aktif=true olana dek hiçbir şey üretilmez/gönderilmez.
insert into public.settings (key, value) values
  ('ayna_aktif', 'false'),
  ('ayna_tempo', 'surpriz')
on conflict (key) do nothing;
