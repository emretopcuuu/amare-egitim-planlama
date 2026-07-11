-- AYNA karakteri Faz 2 — lakap: AYNA'nın kişiye taktığı, davranıştan türeyen
-- sevimli unvan (3. tamamlanan görevde tek Haiku çağrısıyla üretilir; görev ve
-- koçu prompt'larında arada bir doğal biçimde kullanılır). Kill switch kapalıyken
-- üretilmez de kullanılmaz da. RLS: tablo zaten deny-all (servis rolü erişir).
alter table public.participants
  add column if not exists ayna_lakap text;

comment on column public.participants.ayna_lakap is
  'AYNA karakterinin kişiye taktığı lakap (Faz 2). NULL = henüz takılmadı.';
