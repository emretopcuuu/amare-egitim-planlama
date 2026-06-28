-- AYNA'NIN TEK CÜMLESİ — duygusal doruk.
-- Kamp sonunda, tüm görevleri/yanıtları/puanları izlemiş AYNA, kişiye dair
-- SADECE gerçekten dikkat eden birinin yazabileceği TEK bir cümle yazar.
-- "Beni gerçekten gördün" anı. Kişi başına bir kez üretilir, saklanır (mektup
-- ile aynı write-once deseni: participant_id PK + 23505 yarış güvenliği).

CREATE TABLE IF NOT EXISTS ayna_tek_cumle (
  participant_id uuid PRIMARY KEY REFERENCES participants(id) ON DELETE CASCADE,
  cumle text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Derinlemesine savunma: RLS açık, sıfır policy (yalnız service-role erişir).
ALTER TABLE ayna_tek_cumle ENABLE ROW LEVEL SECURITY;
