-- AYNA EŞİ (Gelişim İkilisi) — tamamlayıcı akran eşleştirmesi. Her kişi cumartesi
-- akşamı (3 slot) FARKLI ekipten 3 ayrı eşle yarım saat görüşür. Eşleşme,
-- A'nın güçlü olduğu özellik = B'nin zayıf olduğu özellik (ve tersi) olacak
-- şekilde mevcut 360 puanlarından hesaplanır. a_verir/b_verir = o görüşmede
-- kimin kime hangi özellikte ayna olacağı (trait_id).
CREATE TABLE IF NOT EXISTS ayna_esi (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tur        smallint NOT NULL CHECK (tur BETWEEN 1 AND 3),
  slot       text NOT NULL,
  a_id       uuid NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  b_id       uuid NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  a_verir    smallint NOT NULL,  -- A'nın B'ye güçlü olduğu trait_id
  b_verir    smallint NOT NULL,  -- B'nin A'ya güçlü olduğu trait_id
  a_tamam    boolean NOT NULL DEFAULT false,
  b_tamam    boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (a_id <> b_id)
);
CREATE INDEX IF NOT EXISTS ayna_esi_a_idx ON ayna_esi (a_id, tur);
CREATE INDEX IF NOT EXISTS ayna_esi_b_idx ON ayna_esi (b_id, tur);

INSERT INTO settings (key, value) VALUES ('ayna_esi_acik', 'false') ON CONFLICT (key) DO NOTHING;

ALTER TABLE ayna_esi ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ayna_esi FROM anon, authenticated;
