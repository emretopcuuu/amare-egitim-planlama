-- "Canlı Ayna" — selfie sonrası çoklu açılı yakın yüz kareleri (düz/sağ/sol).
-- Video üretiminde mimik/yüz malzemesi için. Yol listesi: [{aci, path}].
ALTER TABLE public.participants ADD COLUMN IF NOT EXISTS yuz_fotolari jsonb NOT NULL DEFAULT '[]'::jsonb;
