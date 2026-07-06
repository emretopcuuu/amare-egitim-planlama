-- [U7] Onboarding yarıda bırakana TEKRARLANABİLİR otomatik hatırlatma.
-- Eski davranış tek-seferlikti (onboarding_hatirlatma_at damgası bir kez atılınca
-- kişi bir daha dürtülmezdi). Artık ~20 saatte bir, en fazla 3 kez dürtülür ki
-- admin kimseyi elle kovalamak zorunda kalmasın. Sayaç kaç kez dürtüldüğünü tutar;
-- onboarding_hatirlatma_at artık "en son ne zaman dürtüldü" anlamına gelir.
alter table participants
  add column if not exists onboarding_hatirlatma_sayi smallint not null default 0;
