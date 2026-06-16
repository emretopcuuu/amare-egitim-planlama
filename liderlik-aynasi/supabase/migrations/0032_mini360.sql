-- FAZ D3: Mini 360 — Ekip Aynası (opt-in / Diamond adayı). Kişi kendini, ekibinden
-- 3 kişi anonim olarak aynı 6 ifadede puanlar. Sen-ekip farkı = ölçülmüş kör nokta.

CREATE TABLE IF NOT EXISTS mini360_oz (
  participant_id uuid PRIMARY KEY REFERENCES participants(id) ON DELETE CASCADE,
  m1 smallint CHECK (m1 BETWEEN 1 AND 5),
  m2 smallint CHECK (m2 BETWEEN 1 AND 5),
  m3 smallint CHECK (m3 BETWEEN 1 AND 5),
  m4 smallint CHECK (m4 BETWEEN 1 AND 5),
  m5 smallint CHECK (m5 BETWEEN 1 AND 5),
  m6 smallint CHECK (m6 BETWEEN 1 AND 5),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Anonim dış puanlar: yalnız hedef + değerler tutulur (kim verdiği saklanmaz).
CREATE TABLE IF NOT EXISTS mini360_dis (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_id  uuid NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  m1 smallint CHECK (m1 BETWEEN 1 AND 5),
  m2 smallint CHECK (m2 BETWEEN 1 AND 5),
  m3 smallint CHECK (m3 BETWEEN 1 AND 5),
  m4 smallint CHECK (m4 BETWEEN 1 AND 5),
  m5 smallint CHECK (m5 BETWEEN 1 AND 5),
  m6 smallint CHECK (m6 BETWEEN 1 AND 5),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS mini360_dis_target_idx ON mini360_dis (target_id);

INSERT INTO settings (key, value) VALUES ('mini360_acik', 'false') ON CONFLICT (key) DO NOTHING;

ALTER TABLE mini360_oz  ENABLE ROW LEVEL SECURITY;
ALTER TABLE mini360_dis ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON mini360_oz  FROM anon, authenticated;
REVOKE ALL ON mini360_dis FROM anon, authenticated;
