-- SAAT KAYMASI DÜZELTMESİ (2/2): 'ayna-olaylar' pg_cron'u günde 1'den (00:00 UTC
-- = İstanbul 03:00) DAKİKALIK'a çevir. Bu job /api/cron/olaylar'ı çağırır:
-- scheduled_events (dalga/rapor zamanlama), E2 taahhut kişisel push'ları ve E5
-- cesaret fısıltısı push'ları dakika hassasiyeti ister — günde 1 koşumda hepsi
-- gece 03:00'e yığılıyordu. (1/2: lib/orkestrator.ts kampGorelliZaman artık
-- başlangıç gününün İstanbul gece yarısına çıpalı — kod tarafında.)
do $$
declare
  jid bigint;
begin
  select jobid into jid from cron.job where jobname = 'ayna-olaylar';
  if jid is not null then
    perform cron.alter_job(jid, schedule => '* * * * *');
  end if;
end $$;
