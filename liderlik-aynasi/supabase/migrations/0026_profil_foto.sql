-- Kamp öncesi (FAZ 0) profil fotoğrafı — tanışma/eşleştirme için.
-- voice_profiles.photo_path ritüel selfie'sidir; bu ayrı, bağımsız bir alan.
ALTER TABLE public.participants ADD COLUMN IF NOT EXISTS profil_foto_path text;
