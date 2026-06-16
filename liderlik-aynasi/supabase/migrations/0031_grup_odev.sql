-- FAZ D2: Grup ödevleri — ortak açığa göre grup-içi + tamamlayıcı profillerle
-- grup-birlikte ödev. AYNA, grubun Ön Farkındalık agregatından üretir.

CREATE TABLE IF NOT EXISTS grup_odev (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  takim      text NOT NULL,
  tip        text NOT NULL DEFAULT 'grup_ici' CHECK (tip IN ('grup_ici','grup_birlikte')),
  baslik     text NOT NULL,
  govde      text NOT NULL,
  hedef      text,                                  -- hedeflenen ortak açık/alan
  aktif      boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS grup_odev_takim_idx ON grup_odev (takim, aktif, created_at DESC);

-- RLS deny-all (mevcut desen)
ALTER TABLE grup_odev ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON grup_odev FROM anon, authenticated;
