-- G9 — ELMAS BUĞUSU (Tamagotchi-nazik). 24 saat girilmezse elmasa ince buğu
-- iner (SUÇLAMA METNİ YOK — sıfır borç); girince tek dokunuşla silinir. Son
-- görülme zamanı türetmek için tek sütun. Ana sayfa yüklenince ÖNCE eski değere
-- göre buğu hesaplanır, SONRA now'a güncellenir → boşluk son ziyaretten ölçülür.
alter table public.participants add column if not exists son_gorulme timestamptz;
comment on column public.participants.son_gorulme is
  'G9 elmas buğusu: son ana sayfa ziyareti (24s boşlukta nazik buğu). Sıfır borç.';
