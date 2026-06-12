-- YANSIMAN Adım 2: görev fısıltısı.
-- AYNA görev atarken, klonu hazır katılımcı için görev metni katılımcının
-- kendi sesiyle mp3'e çevrilir; dosyanın storage yolu burada tutulur.
alter table missions add column if not exists voice_path text;
