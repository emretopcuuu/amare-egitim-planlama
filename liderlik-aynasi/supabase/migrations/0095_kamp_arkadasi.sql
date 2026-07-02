-- [3.1] KAMP ARKADAŞI HATTI — kamptaki eşleşme kalitesinden ("gerçek miydi?" en
-- yüksek çiftler; veri yoksa karsilasma.ts persona eşleşmesi) kalıcı ikili/üçlü
-- atanır. Haftada 1 çift taraflı hatırlatma + tek dokunuş check-in. Kimse dışarıda
-- kalmaz (tek sayıysa bir üçlü). uyeler: 2 ya da 3 katılımcı id'si.
create table if not exists kamp_arkadasi (
  id         uuid        primary key default gen_random_uuid(),
  uyeler     uuid[]      not null,          -- 2 veya 3 katılımcı
  created_at timestamptz not null default now()
);

-- Check-in: bir üyenin "aradık/konuştuk" tek dokunuşu (hafta bazlı, isteğe bağlı).
create table if not exists kamp_arkadasi_checkin (
  id             uuid        primary key default gen_random_uuid(),
  arkadaslik_id  uuid        not null references kamp_arkadasi(id) on delete cascade,
  participant_id uuid        not null references participants(id) on delete cascade,
  created_at     timestamptz not null default now()
);
create index if not exists kamp_arkadasi_checkin_idx on kamp_arkadasi_checkin (arkadaslik_id, created_at);

alter table kamp_arkadasi enable row level security;
revoke all on kamp_arkadasi from anon, authenticated;
alter table kamp_arkadasi_checkin enable row level security;
revoke all on kamp_arkadasi_checkin from anon, authenticated;
