-- KARİYER /hedef'e taşındı — Pusula başındaki kariyer formu kaldırıldı; kariyer
-- artık nedenlerden SONRA, hedef oluşturulurken alınıyor. /hedef başlangıç formu
-- 'ne noktadasın' kartları yerine 8 basamaklı kariyer seçimi + Son 3 ay ortalama
-- OV + VOL topluyor.

-- 1) Son 3 ayın ortalama VOL'si (OV'nin eşi; ikisi de zorunlu, sayısal).
ALTER TABLE public.hedef
  ADD COLUMN IF NOT EXISTS baslangic_vol integer
    CHECK (baslangic_vol IS NULL OR (baslangic_vol >= 0 AND baslangic_vol <= 1000000000));

-- 2) Kişinin /hedef'te seçtiği kariyer basamağı (referans; ayrıca participants'a
--    da yazılır ve persona oradan türetilir). 8 basamaklı One Team ladder.
ALTER TABLE public.hedef
  ADD COLUMN IF NOT EXISTS kariyer_seviyesi text
    CHECK (kariyer_seviyesi IN (
      'leader', 'senior_leader', 'exec_leader', 'diamond',
      '1_star_diamond', '2_star_diamond', '3_star_diamond', 'presidential_diamond'
    ));

COMMENT ON COLUMN public.hedef.baslangic_vol IS 'Son 3 ayın ortalama VOL''si (zorunlu)';
COMMENT ON COLUMN public.hedef.kariyer_seviyesi IS 'Kişinin /hedef''te seçtiği kariyer basamağı (participants''a da yazılır)';
