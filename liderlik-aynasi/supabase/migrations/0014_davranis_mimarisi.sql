-- DAVRANIŞ MİMARİSİ (Behavioral Blueprint): eustress zorluğu, haftalık
-- momentum, senkron an, direnç simülatörü, kayma radarı ve 90 Günlük
-- Yolculuk altyapısı.

-- Görev türlerine 'senkron' (eşzamanlı kolektif an) ve 'simulasyon'
-- (itiraz karşılama provası) eklendi; eustress için zorluk kolonu.
alter table missions drop constraint missions_kind_check;
alter table missions add constraint missions_kind_check
  check (kind in ('gozlem','cesaret','yansima','gizli','tahmin','soz','senkron','simulasyon'));
alter table missions add column if not exists difficulty smallint not null default 2
  check (difficulty between 1 and 3);

-- Haftalık Momentum Endeksi: eğilim görünür olsun diye anlık görüntü saklanır
create table if not exists momentum_scores (
  participant_id uuid not null references participants(id) on delete cascade,
  week_start date not null,
  score smallint not null check (score between 0 and 100),
  detail jsonb,
  created_at timestamptz not null default now(),
  primary key (participant_id, week_start)
);
alter table momentum_scores enable row level security;
revoke all on momentum_scores from anon, authenticated;

-- Kayma (churn) radarı: nazik dürtme ve lider uyarısının izi
create table if not exists churn_radar (
  participant_id uuid primary key references participants(id) on delete cascade,
  nudged_at timestamptz,
  admin_alerted_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table churn_radar enable row level security;
revoke all on churn_radar from anon, authenticated;
