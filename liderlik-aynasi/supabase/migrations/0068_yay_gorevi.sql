-- #4b Görev yayı aşamasını TEMAYA ÖZEL saymak için işaret.
-- Sorun: yay aşaması (ısınma → yüzleşme → kanıt → entegrasyon) toplam tamamlanan
-- görev sayısından ilerliyordu; kişi yay temasıyla hiç çalışmadan terfi edebiliyordu
-- (bir gözlem + bir senkron görevle de). Çekirdek tema (öz-saygı/güven/iç engel)
-- bir trait olmadığı için trait_id ile bağlanamıyor — bu yüzden görev üretildiğinde
-- yay aktifse görevi açıkça işaretliyoruz. Aşama yalnız bu işaretli scored
-- görevlerden sayılacak.
alter table public.missions
  add column if not exists yay_gorevi boolean not null default false;

-- Aşama sorgusu kişi + işaret + durum üzerinden gider.
create index if not exists missions_yay_gorevi_idx
  on public.missions (participant_id, yay_gorevi, status);
