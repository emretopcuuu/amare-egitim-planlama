-- Görev üretme sistemi — 10 geliştirme altyapısı

-- #2 Yanıt madenciliği: her yanıttan Haiku'nun çıkardığı tema etiketleri
ALTER TABLE missions ADD COLUMN IF NOT EXISTS response_tags TEXT[];
CREATE INDEX IF NOT EXISTS idx_missions_response_tags ON missions USING GIN(response_tags);

-- #4 Bağ görevi: insanlar arasında gerçek bağlantı kuran yeni tür
ALTER TABLE missions DROP CONSTRAINT IF EXISTS missions_kind_check;
ALTER TABLE missions ADD CONSTRAINT missions_kind_check
  CHECK (kind IN (
    'gozlem','cesaret','yansima','gizli','tahmin',
    'soz','senkron','simulasyon','bag'
  ));

-- #8 Micro-sprint: 30 dakikalık anlık eylem bayrağı
ALTER TABLE missions ADD COLUMN IF NOT EXISTS micro_sprint BOOLEAN NOT NULL DEFAULT FALSE;
