-- GELİŞTİRME #9 (2.tur): Periyodik Mini 360 — tur (round) sayacı. Ekip Aynası
-- kamp boyunca 2-3 kez tekrarlanır; her tur ayrı saklanır (algı trendi).
ALTER TABLE mini360_oz  ADD COLUMN IF NOT EXISTS tur smallint NOT NULL DEFAULT 1;
ALTER TABLE mini360_dis ADD COLUMN IF NOT EXISTS tur smallint NOT NULL DEFAULT 1;

ALTER TABLE mini360_oz DROP CONSTRAINT IF EXISTS mini360_oz_pkey;
ALTER TABLE mini360_oz ADD PRIMARY KEY (participant_id, tur);

CREATE INDEX IF NOT EXISTS mini360_dis_hedef_tur_idx ON mini360_dis (target_id, tur);

INSERT INTO settings (key, value) VALUES ('mini360_tur', '1') ON CONFLICT (key) DO NOTHING;
