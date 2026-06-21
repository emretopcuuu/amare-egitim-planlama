-- FAZ A — Hedef "somutlaştırma": kısa AI sohbetinden sonra kişi TÜM kariyer
-- basamaklarını + ortalama gelirlerini görür, hedefini seçer; 3 soruyla (gelir →
-- süre → günlük saat) kişisel kariyer planı çıkar. Plan görevler/rapor/söz için
-- saklanır.
ALTER TABLE public.hedef
  ADD COLUMN IF NOT EXISTS hedef_rutbe text,        -- seçilen kariyer basamağı
  ADD COLUMN IF NOT EXISTS hedef_gelir bigint,      -- hedef aylık gelir (TL)
  ADD COLUMN IF NOT EXISTS sure_ay smallint,        -- hedefe ulaşma süresi (ay)
  ADD COLUMN IF NOT EXISTS gunluk_saat text,        -- "Günde 5+ saat" etiketi
  ADD COLUMN IF NOT EXISTS gunluk_saat_sayi numeric,-- günlük saat (sayı)
  ADD COLUMN IF NOT EXISTS plan jsonb;              -- hesaplanmış kariyer planı
