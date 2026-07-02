-- [E5] BAŞLADIM CANLI MODU — push katmanı. "Başladım" (started_at) zaten var +
-- in-app cesaret fısıltısı (BaslaButonu) zaten gösteriliyor. Bu migration yalnız
-- fısıltının PUSH olarak da gitmesi için tek-seferlik guard'ı ekler: uygulama
-- arkaplandayken de telefona ulaşsın. (Mevcut started_at kolonu kullanılır; yeni
-- basladi_at İCAT EDİLMEZ.)
alter table missions add column if not exists cesaret_push boolean not null default false;

-- Cron sorgusu için kısmi indeks: başlamış ama fısıltı gönderilmemiş.
create index if not exists missions_cesaret_bekleyen_idx
  on missions (started_at)
  where cesaret_push = false and started_at is not null;
