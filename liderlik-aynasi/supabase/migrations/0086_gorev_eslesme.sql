-- FAZ 1.3 — EŞLEŞME DENGELEYİCİ: görev motorunun ürettiği isimli/eşleşmeli
-- görevlerin (bag/tanık/çift türleri) kayıt defteri. Aynı çiftin kampta bir
-- kez eşleşmesini, günlük hedef-olma tavanını ve "hiç eşleşmemişe öncelik"
-- kuralını uygulamak için lib/gorevEslesme.ts bu tabloyu okur/yazar.
-- gercek_miydi: eşleşmeli görev tesliminde katılımcıdan alınan 1-5 "bu
-- konuşma gerçek miydi?" puanı — eşleşme kalitesini ölçer, önceliklendirmeyi
-- besler (FAZLAR 2-3 bu tabloyu kullanır; bu migration yalnız temeli kurar).
create table if not exists gorev_eslesme (
  id          uuid        primary key default gen_random_uuid(),
  mission_id  uuid        not null references missions(id) on delete cascade,
  kaynak_id   uuid        not null references participants(id) on delete cascade,
  hedef_id    uuid        not null references participants(id) on delete cascade,
  isimli      boolean     not null default false,
  gercek_miydi smallint   check (gercek_miydi between 1 and 5),
  created_at  timestamptz not null default now(),
  check (kaynak_id <> hedef_id),
  unique (mission_id)
);

create index if not exists gorev_eslesme_kaynak_idx on gorev_eslesme (kaynak_id, created_at);
create index if not exists gorev_eslesme_hedef_idx on gorev_eslesme (hedef_id, created_at);

alter table gorev_eslesme enable row level security;
revoke all on gorev_eslesme from anon, authenticated;
