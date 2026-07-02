-- AI İSTEK LOGU — kullanıcı başına AI çağrı limiti (maliyet sigortası).
-- Ücretli AI uçlarında (koç, pusula, hedef, değer önerileri...) hiç limit
-- yoktu: tek bir istemci bug'ı ya da kötü niyetli döngü sınırsız Anthropic/
-- ElevenLabs maliyeti üretebilirdi. Bu tablo pencere-bazlı sayım için tutulur.
-- Bilinçli olarak FK YOK: telemetri tablosu — bayat oturumda bile yazılabilsin.
create table if not exists ai_istek_log (
  id bigint generated always as identity primary key,
  participant_id uuid not null,
  kaynak text not null,
  created_at timestamptz not null default now()
);

create index if not exists ai_istek_log_pid_zaman
  on ai_istek_log (participant_id, created_at desc);

-- Deny-all erişim modeli (diğer tablolarla tutarlı): RLS açık, policy yok.
alter table ai_istek_log enable row level security;
revoke all on ai_istek_log from anon, authenticated;
