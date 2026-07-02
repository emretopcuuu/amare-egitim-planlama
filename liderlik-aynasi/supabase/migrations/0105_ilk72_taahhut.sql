-- [E2] İLK 72 SAAT KARTI — söz mühürlendikten hemen sonra, salon içinde kişi
-- oyun planından türetilmiş 3 mikro adıma KENDİ gün+saatini seçer. Seçilen anda
-- kişisel push gider (kamp sonrası p72 protokolünden AYRI — bu salon içi, kişiye
-- özel zamanlı). Kişisel-zamanlı push için mevcut altyapı yoktu; taahhut tablosu +
-- dakikalık cron (app/api/cron/olaylar) bekleyen taahhütleri gönderir.
create table if not exists taahhut (
  id              uuid        primary key default gen_random_uuid(),
  participant_id  uuid        not null references participants(id) on delete cascade,
  adim            smallint    not null check (adim between 1 and 3),
  metin           text        not null,
  planlanan_zaman timestamptz not null,
  durum           text        not null default 'bekliyor' check (durum in ('bekliyor','yapildi','atlandi')),
  push_gonderildi boolean     not null default false,
  created_at      timestamptz not null default now(),
  unique (participant_id, adim)
);

-- Cron sorgusu: gönderilmemiş + zamanı gelmiş taahhütler.
create index if not exists taahhut_bekleyen_idx on taahhut (planlanan_zaman) where push_gonderildi = false;

alter table taahhut enable row level security;
revoke all on taahhut from anon, authenticated;
