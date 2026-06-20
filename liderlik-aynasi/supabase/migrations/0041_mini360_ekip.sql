-- Mini 360 — Ekip Aynası'nı "anonim link paylaş" modelinden UYGULAMA-İÇİ EKİP
-- OYLAMASINA çevirir:
--   • Dış puanlar artık GİRİŞLİ verilir. Değerlendirenin kimliği (rater_id)
--     yalnız SUNUCUDA tutulur; hiçbir DTO'ya, sonuç tablosuna ya da hedefe
--     asla sızmaz (uygulamanın sütun-seviyesi gizlilik garantisiyle aynı).
--     Bu kimlik sayesinde üç kural mümkün olur:
--       1) "Önce kendini puanla" kapısı (öz-puan tamamlanmadan başkası puanlanamaz)
--       2) Bir değerlendiren, bir hedefi, bir turda yalnız BİR kez puanlar (günceller)
--       3) "Bu kişiyi henüz oylamayanlar" hesaplanabilir (nudge için)
--   • Kişi "ekibimden değerlendirme iste" diyebilir → oylanma_istiyor bayrağı.

ALTER TABLE mini360_dis
  ADD COLUMN IF NOT EXISTS rater_id uuid REFERENCES participants(id) ON DELETE CASCADE;

-- Bir değerlendiren × hedef × tur → tek satır (yeniden gönderim günceller).
-- Partial DEĞİL: upsert onConflict partial index'i çıkaramaz. NULL rater_id'li
-- eski anonim satırlar Postgres'te "distinct" sayıldığından çakışmaz — güvenli.
CREATE UNIQUE INDEX IF NOT EXISTS mini360_dis_rater_hedef_tur_uniq
  ON mini360_dis (rater_id, target_id, tur);

-- "Bu turda kimleri değerlendirdim" sorgusu için.
CREATE INDEX IF NOT EXISTS mini360_dis_rater_tur_idx ON mini360_dis (rater_id, tur);

-- Kişinin "ekibim beni değerlendirsin" isteği (tur bazında).
ALTER TABLE mini360_oz
  ADD COLUMN IF NOT EXISTS oylanma_istiyor boolean NOT NULL DEFAULT false;
