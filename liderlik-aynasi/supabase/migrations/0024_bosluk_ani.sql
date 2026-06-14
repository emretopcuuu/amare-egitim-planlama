-- FAZ 1: Boşluk Anı — kişinin iç engelini (pusula.ic_engel) kamptaki kanıtla
-- çürüten zirve. Kişi başına tek kayıt (mirror_letters deseni).
CREATE TABLE IF NOT EXISTS bosluk_ani (
  participant_id uuid PRIMARY KEY REFERENCES participants(id) ON DELETE CASCADE,
  demolisyon     jsonb,        -- {reaktivasyon, kanitlar:[{kaynak,metin}], donus, davet}
  yeni_cumle     text,         -- kişinin KENDİ yazdığı yeni cümle (kimlik çapası)
  yeni_cumle_at  timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- Boşluk Anı penceresi (Gün 3 zirvesi) — varsayılan kapalı
INSERT INTO settings (key, value) VALUES ('bosluk_acik','false')
  ON CONFLICT (key) DO NOTHING;

ALTER TABLE bosluk_ani ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON bosluk_ani FROM anon, authenticated;
