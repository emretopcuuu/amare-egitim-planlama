-- FAZ 0: Pusula (Nedenler & Çekirdek Profil) — kamp öncesi kişiselleştirme omurgası

-- Kişi başına tek çekirdek profil
CREATE TABLE IF NOT EXISTS pusula (
  participant_id uuid PRIMARY KEY REFERENCES participants(id) ON DELETE CASCADE,
  oncelikler     jsonb NOT NULL DEFAULT '[]'::jsonb,   -- [{sira, metin, olmazsaolmaz, duygusal_not}]
  cekirdek_neden jsonb NOT NULL DEFAULT '[]'::jsonb,   -- ["...","...","..."] 1-3, kişinin kendi kelimeleri
  mevcut_bosluk  text,                                  -- hayat-öncelik açığı (acı/gerilim)
  ic_engel       text,                                  -- iç engel / sınırlayıcı inanç (A'nın korkusu)
  ic_engel_kat   text,                                  -- kategori: impostor|degersizlik|red_korkusu|kontrol|...
  ozet           text,                                  -- AI'ın tüm gelecek kişiselleştirmede enjekte edeceği özet
  asama          text NOT NULL DEFAULT 'cerceve',       -- cerceve|oncelikler|eleme|bosluk|engel|tamam
  tamamlandi_at  timestamptz,
  baz_guven      smallint,                              -- opsiyonel 0-100 başlangıç öz-yeterlik (Eylül baz çizgisi)
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- Nedenler diyalog transkripti (devam ettirme + kampta kişinin kendi sözlerini geri çalma)
CREATE TABLE IF NOT EXISTS pusula_mesajlar (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  participant_id uuid NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  rol            text NOT NULL CHECK (rol IN ('kullanici','ayna')),
  icerik         text NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pusula_mesajlar_kisi_idx ON pusula_mesajlar (participant_id, created_at);

-- Kilit mekaniği: kampa fiziksel giriş anı (oda QR ile dolar)
ALTER TABLE participants ADD COLUMN IF NOT EXISTS camp_unlocked_at timestamptz;

-- Ayarlar: online pusula penceresi + oda QR sırrı (admin doldurur)
INSERT INTO settings (key, value) VALUES
  ('pusula_acik', 'false'),
  ('kamp_kilit_kodu', '')
ON CONFLICT (key) DO NOTHING;

-- RLS deny-all (mevcut desen)
ALTER TABLE pusula           ENABLE ROW LEVEL SECURITY;
ALTER TABLE pusula_mesajlar  ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON pusula          FROM anon, authenticated;
REVOKE ALL ON pusula_mesajlar FROM anon, authenticated;
