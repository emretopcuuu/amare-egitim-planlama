-- FAZ A Hedef: başlangıç OV sütunu.
-- Kişinin form sırasında girdiği "son 3 ay ortalama OV" değeri; simülasyon buradan beslenir.
ALTER TABLE public.hedef
  ADD COLUMN IF NOT EXISTS baslangic_ov integer; -- son 3 ay ortalama OV (zorunlu, UI'da validate edilir)
