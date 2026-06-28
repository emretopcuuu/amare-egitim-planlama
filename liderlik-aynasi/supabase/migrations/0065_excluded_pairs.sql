-- Eşleştirmeden hariç tutulacak çiftler. Çift yönlü: (a,b) eklemek (b,a)'yı da kapsar.
-- Admin bu tabloyu doldurunca algoritma bu ikiliye asla atama yapmaz.
create table if not exists excluded_pairs (
  id         uuid        primary key default gen_random_uuid(),
  a_id       uuid        not null references participants(id) on delete cascade,
  b_id       uuid        not null references participants(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (a_id <> b_id),
  unique (a_id, b_id)
);

create index if not exists excluded_pairs_a_idx on excluded_pairs (a_id);
create index if not exists excluded_pairs_b_idx on excluded_pairs (b_id);

alter table excluded_pairs enable row level security;
revoke all on excluded_pairs from anon, authenticated;
