-- YANSIMAN Adım 3-4: sesli Ayna Mektubu ve sesli SÖZ dönüşü.
-- Mektup sesi mirror_letters'a, SÖZ sesi ses profiline bağlanır.
alter table mirror_letters add column if not exists voice_path text;
alter table voice_profiles add column if not exists soz_path text;
