-- GELİŞTİRME #1: Ayna Koçu — adayın her an açabildiği sürekli AYNA sohbeti.
-- ÖF + Pusula + görev bağlamını bilen bağlamsal mentor. Mesajlar kişiye özel.

CREATE TABLE IF NOT EXISTS kocu_mesajlar (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id uuid NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  rol            text NOT NULL CHECK (rol IN ('kullanici','ayna')),
  icerik         text NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS kocu_mesajlar_kisi_idx ON kocu_mesajlar (participant_id, created_at);

ALTER TABLE kocu_mesajlar ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON kocu_mesajlar FROM anon, authenticated;
