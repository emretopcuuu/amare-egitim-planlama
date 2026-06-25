-- Katılımcı kariyer seviyesi — mentorluk görevi eşleştirmesi için.
-- Amare basamakları: Leader → Senior Leader → Exec. Leader → Diamond (ve üzeri).
-- Admin CSV import veya katılımcı panelinden doldurur.
-- NULL = seviye girilmemiş (mentorluk görevinde herkesle eşleştir).
ALTER TABLE public.participants
  ADD COLUMN IF NOT EXISTS kariyer_seviyesi text
    CHECK (kariyer_seviyesi IN ('leader', 'senior_leader', 'exec_leader', 'diamond'));

COMMENT ON COLUMN public.participants.kariyer_seviyesi IS
  'Kamp katılımcısının mevcut Amare kariyer basamağı (mentorluk eşleştirmesi için)';
