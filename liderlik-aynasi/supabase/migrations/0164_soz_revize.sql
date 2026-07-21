-- [B#13] SÖZ REVİZYON RİTÜELİ — yolculuğun 30. gününde kişi verdiği sözü BİR KEZ
-- yenileyebilir (hayat değişir, hedef büyür). revize_at damgası "bir kez"i
-- zorlar ve "sözünü yeniledi" durumunu gösterir. Ses korunur (sözün ruhu aynı),
-- yalnız metin güncellenir; şahitlere haber gider.
alter table soz add column if not exists revize_at timestamptz;
