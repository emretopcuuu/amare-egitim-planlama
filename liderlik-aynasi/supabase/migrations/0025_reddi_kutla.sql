-- FAZ 3: Reddi Kutla (Go-for-No / Fun Failure). Ret bir kayıp değil VERİDİR.
-- Kişi aldığı "Hayır"ı kaydeder; sayaç = Tecrübe Puanı. Yeni cümle, reti
-- kimlikten ayırdığı için bu mekanik ilk kez gerçekten çalışır.
CREATE TABLE IF NOT EXISTS redler (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  participant_id uuid NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  aciklama       text,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS redler_kisi_idx ON redler (participant_id, created_at);

ALTER TABLE redler ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON redler FROM anon, authenticated;
