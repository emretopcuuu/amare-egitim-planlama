-- ÖN FARKINDALIK (Kamp öncesi Ayna/Kalibrasyon çalışması) — Faz A: Katman 1.
-- Pusula'nın kardeşi; algı (kendini nasıl görüyorsun) vs gerçek (davranış/veri)
-- mesafesini ölçer. Bayrak arkasında; canlı kampı etkilemez.

-- Kişi başına tek yolculuk durumu + hesaplanan profil (kişiye özel görev yakıtı)
CREATE TABLE IF NOT EXISTS on_farkindalik (
  participant_id uuid PRIMARY KEY REFERENCES participants(id) ON DELETE CASCADE,
  profil         jsonb NOT NULL DEFAULT '{}'::jsonb,  -- {katman1:{bloklar,enZayif}, ...}
  asama          text NOT NULL DEFAULT 'katman1',     -- katman1|katman2|...|tamam
  basladi_at     timestamptz,
  tamamlandi_at  timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- Tek tek madde yanıtları (kısmi/aşamalı kayıt; her madde upsert ile güncellenir)
CREATE TABLE IF NOT EXISTS on_farkindalik_yanit (
  participant_id uuid NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  madde_kod      text NOT NULL,                        -- ör. "k1.oz_saygi.2"
  deger_sayi     smallint,                             -- Likert / rakam yanıtı
  deger_metin    text,                                 -- yazılı yanıt (sonraki katmanlar)
  updated_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (participant_id, madde_kod)
);

-- Ayar: ön farkındalık penceresi (admin açar; varsayılan kapalı)
INSERT INTO settings (key, value) VALUES ('on_farkindalik_acik', 'false')
ON CONFLICT (key) DO NOTHING;

-- RLS deny-all (mevcut desen: tüm erişim sunucu service-role üzerinden)
ALTER TABLE on_farkindalik       ENABLE ROW LEVEL SECURITY;
ALTER TABLE on_farkindalik_yanit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON on_farkindalik       FROM anon, authenticated;
REVOKE ALL ON on_farkindalik_yanit FROM anon, authenticated;
