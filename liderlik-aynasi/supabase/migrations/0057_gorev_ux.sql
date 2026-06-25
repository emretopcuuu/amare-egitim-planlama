-- GÖREV UX İYİLEŞTİRMELERİ — başladım / ertele / telafi durumları.
-- (Süre-dolmadan hatırlatma zaten reminded_at ile mevcut.)

ALTER TABLE public.missions
  -- #1 "Başladım": saha görevi gerçek zaman alır; sayaç boşuna kaygı yaratmasın.
  ADD COLUMN IF NOT EXISTS started_at timestamptz,
  -- #2 "Ertele": kişi meşgulken görevi öteler; kötüye kullanımı sınırlamak için sayaç.
  ADD COLUMN IF NOT EXISTS ertelenme_sayisi smallint NOT NULL DEFAULT 0,
  -- #3 "Telafi": süresi geçen görev yine de yapıldıysa işaretlenir (azalan kıvılcım).
  ADD COLUMN IF NOT EXISTS gec_tamamlandi boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.missions.started_at IS
  'Katılımcının "başladım" dediği an — sayaç sakinleşir, AYNA uğraşıyor/umursamadı ayırır';
COMMENT ON COLUMN public.missions.ertelenme_sayisi IS
  'Görevin kaç kez ertelendiği (en fazla 2 — kötüye kullanımı önler)';
COMMENT ON COLUMN public.missions.gec_tamamlandi IS
  'Süresi geçtikten sonra telafi olarak tamamlandı mı (kıvılcım yarıya iner)';
