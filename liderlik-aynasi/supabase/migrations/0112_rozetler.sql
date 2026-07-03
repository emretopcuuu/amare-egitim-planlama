-- [KURULUM 7/8] ROZETLER — tek seferlik başarımlar. Kıvılcım yalnız
-- missions.spark_points'ten türediği için (ayrı ledger yok), rozet kıvılcımını
-- MISSIONS'ı kirletmeden ayrı tutmak istiyoruz: bu tablo hem "kazanıldı mı"
-- kaydı hem küçük kıvılcım kaynağı. Toplam kıvılcım kişinin kimlik başlığında
-- (lib/elmas.ts) bu tabloyu da ekleyerek gösterilir; rekabetçi /ekran ligi
-- salt görev-tabanlı kalır (adil).
create table if not exists rozetler (
  id             uuid        primary key default gen_random_uuid(),
  participant_id uuid        not null references participants(id) on delete cascade,
  kod            text        not null,
  kivilcim       integer     not null default 0,
  created_at     timestamptz not null default now(),
  unique (participant_id, kod)
);

create index if not exists rozetler_katilimci_idx on rozetler (participant_id);

alter table rozetler enable row level security;
revoke all on rozetler from anon, authenticated;
