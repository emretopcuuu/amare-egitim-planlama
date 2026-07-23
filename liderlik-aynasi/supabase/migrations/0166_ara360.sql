-- [E#38] 45. GÜN ARA-360 — yolun ortasında 3 soruluk hızlı öz-değerlendirme:
-- kampta 360° aynada çıkan gelişim alanı (kör nokta) 45 günde ne kadar ilerledi,
-- kişi kendini ne kadar net görüyor, kalan 45 güne enerjisi ne. Kişi başına bir kez.
-- NOT: onboarding'in "mini360"ından (mini360_oz) AYRI — o kamp öncesi öz-puan;
-- bu yolculuğun ortasındaki ara ölçüm. İsim çakışmasın diye "ara_360".
create table if not exists ara_360 (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references participants(id) on delete cascade,
  gun int not null,              -- 45
  kor_nokta text,                -- o anki gelişim alanı adı (bağlam)
  p_gelisim int,                 -- kör nokta gelişimi (1-5)
  p_netlik int,                  -- kendini görme netliği (1-5)
  p_enerji int,                  -- kalan yola enerji (1-5)
  created_at timestamptz not null default now(),
  unique (participant_id, gun)
);
alter table ara_360 enable row level security;
