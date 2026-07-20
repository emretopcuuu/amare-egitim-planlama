-- A9 + A3 — Takdire foto ve sesli takdir. kudos'a opsiyonel medya yolları.
-- Additive + nullable: mevcut takdirler etkilenmez. Dosyalar 'sesler' bucket'ında
-- takdir/{pid}-{uuid}.{ext} altında; burada yalnız yol tutulur.
alter table public.kudos add column if not exists foto_path text;
alter table public.kudos add column if not exists ses_path text;
