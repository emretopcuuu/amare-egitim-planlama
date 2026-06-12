-- Foto Ritüeli: girişte alınan fotoğraf sunucuda hayalet silüete çevrilir
-- ve göl sahnesindeki su yansıması kişinin kendi silüeti olur.
alter table voice_profiles add column if not exists face_path text;
