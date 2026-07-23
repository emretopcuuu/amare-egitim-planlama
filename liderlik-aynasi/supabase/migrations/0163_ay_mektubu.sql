-- [D#33] AY DÖNÜMÜ MEKTUBU — yolculuğun 30/60/90. gününde AYNA'nın kişiye özel,
-- kendi verisinden (söz + ilerleme + kör nokta) yazdığı AI mektup. Lazy üretilir
-- (kişi açınca, bir kez), gelisim_dosyasi deseniyle cache'lenir → tik'te 150
-- kişiye toplu AI çağrısı YOK (timeout/maliyet güvencesi). Kişi başına milestone
-- başına tek mektup (unique).
create table if not exists ay_mektubu (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references participants(id) on delete cascade,
  milestone int not null, -- 30 | 60 | 90
  metin text not null,
  created_at timestamptz not null default now(),
  unique (participant_id, milestone)
);

-- Derinlemesine savunma: RLS açık, sıfır policy (anon/authenticated deny-all;
-- tüm erişim sunucu service-role ile). Repo geneliyle aynı desen.
alter table ay_mektubu enable row level security;
