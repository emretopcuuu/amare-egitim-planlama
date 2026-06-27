-- KAMP PROVA SİMÜLATÖRÜ — izole simülasyon katılımcıları.
-- Amaç: gerçek kamptan önce 20 sanal karakterle tüm akışı (pusula → eşleştirme →
-- dalga → görev → grup → ayna eşi → mühür) adım adım canlandırmak. Gerçek
-- katılımcılara ASLA dokunmaz: tüm sim verisi `simulasyon = true` ile işaretlenir,
-- sıfırlama yalnız bu satırları siler.

-- Sim katılımcı bayrağı. Gerçek kayıtlar varsayılan false kalır.
ALTER TABLE participants
  ADD COLUMN IF NOT EXISTS simulasyon boolean NOT NULL DEFAULT false;

-- Sim kohortunu hızlı süzmek + güvenli sıfırlama için.
CREATE INDEX IF NOT EXISTS idx_participants_simulasyon
  ON participants(simulasyon)
  WHERE simulasyon = true;
