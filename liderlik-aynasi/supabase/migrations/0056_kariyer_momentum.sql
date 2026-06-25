-- KARİYER MOMENTUMU — "Üç Kariyer Hâli" (A/B/C) için ikinci eksen.
-- Pusula iç engelinin yanına kariyer ivmesini ekler: aynı unvandaki iki lider
-- farklı ruh hâlinde olabilir. Kişi bu rakamları kampa girişte kendisi yazar
-- (Pusula öncesi); sistem bunlardan kariyer_durumu'nu TÜRETİR.
--
-- Amare basamakları (ladder): leader < senior_leader < exec_leader < diamond < star.
-- 0055 yalnız diamond'a kadar gidiyordu; "düşüşten dönen" eski star'ları
-- modelleyebilmek için ladder'ı star ile genişletiyoruz.

-- 1) Mevcut kariyer (kariyer_seviyesi) CHECK'ini star dahil edecek şekilde yenile.
ALTER TABLE public.participants
  DROP CONSTRAINT IF EXISTS participants_kariyer_seviyesi_check;
ALTER TABLE public.participants
  ADD CONSTRAINT participants_kariyer_seviyesi_check
    CHECK (kariyer_seviyesi IN ('leader', 'senior_leader', 'exec_leader', 'diamond', 'star'));

-- 2) Momentum türetmesi için gereken ham veriler (hepsi opsiyonel; eksikse
--    sistem jenerik davranışa düşer).
ALTER TABLE public.participants
  ADD COLUMN IF NOT EXISTS en_yuksek_kariyer text
    CHECK (en_yuksek_kariyer IN ('leader', 'senior_leader', 'exec_leader', 'diamond', 'star')),
  ADD COLUMN IF NOT EXISTS gecen_ay_kariyer text
    CHECK (gecen_ay_kariyer IN ('leader', 'senior_leader', 'exec_leader', 'diamond', 'star')),
  ADD COLUMN IF NOT EXISTS kidem_ay smallint
    CHECK (kidem_ay IS NULL OR (kidem_ay >= 0 AND kidem_ay <= 600)),
  ADD COLUMN IF NOT EXISTS amare_puan integer
    CHECK (amare_puan IS NULL OR (amare_puan >= 0 AND amare_puan <= 1000000000));

-- 3) Türetilmiş kariyer hâli (A/B/C/A+). lib/persona.ts hesaplar, buraya yazılır.
--    Tek kaynak: değer değişince yeniden hesaplanıp güncellenir.
ALTER TABLE public.participants
  ADD COLUMN IF NOT EXISTS kariyer_durumu text
    CHECK (kariyer_durumu IN ('test_edilmemis', 'duraksama', 'gerileme', 'yukselis'));

COMMENT ON COLUMN public.participants.en_yuksek_kariyer IS
  'Kişinin ulaştığı en yüksek Amare basamağı (momentum türetmesi için)';
COMMENT ON COLUMN public.participants.gecen_ay_kariyer IS
  'Geçen ayki basamak — momentum yönü (yükseliş/duraksama) için';
COMMENT ON COLUMN public.participants.kidem_ay IS
  'Kaç aydır bu işte/seviyede — test_edilmemis ile duraksama ayrımı için';
COMMENT ON COLUMN public.participants.amare_puan IS
  'Amare iç puanı (opsiyonel, ince ayar)';
COMMENT ON COLUMN public.participants.kariyer_durumu IS
  'TÜRETİLMİŞ kariyer hâli: test_edilmemis(A) / duraksama(B) / gerileme(C) / yukselis(A+)';
