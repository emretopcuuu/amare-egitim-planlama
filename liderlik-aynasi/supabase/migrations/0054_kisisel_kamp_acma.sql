-- Kişisel kamp açma token'ı: her katılımcıya benzersiz, tahmin edilemez bir
-- jeton. Kamp mührünü AÇAN QR artık bu jetonu taşır (/ac?u=<token>) — kişiye
-- özeldir, başkasının QR'ıyla açılmaz, paylaşmak işe yaramaz. Giriş ise ayrı
-- 6 haneli kodla (şifre) yapılır; QR yalnız "kampı aç" işlevi taşır.

ALTER TABLE participants ADD COLUMN IF NOT EXISTS camp_unlock_token TEXT;

-- Mevcut satırları doldur (uuid'den tire çıkarılmış 32 hex karakter)
UPDATE participants
SET camp_unlock_token = replace(gen_random_uuid()::text, '-', '')
WHERE camp_unlock_token IS NULL;

-- Yeni eklenen katılımcılar (CSV import dahil) otomatik jeton alır
ALTER TABLE participants
  ALTER COLUMN camp_unlock_token SET DEFAULT replace(gen_random_uuid()::text, '-', '');

CREATE UNIQUE INDEX IF NOT EXISTS idx_participants_camp_unlock_token
  ON participants(camp_unlock_token);
