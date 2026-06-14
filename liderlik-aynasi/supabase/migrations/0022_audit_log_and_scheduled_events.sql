-- #10 İşlem günlüğü: kritik admin eylemleri kaydedilir (son 20 admin panelinde gösterilir)
CREATE TABLE IF NOT EXISTS audit_log (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  admin_id   uuid    REFERENCES participants(id) ON DELETE SET NULL,
  eylem      text    NOT NULL,
  detay      jsonb   DEFAULT '{}'::jsonb,
  ip         text,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS audit_log_created_at_idx ON audit_log (created_at DESC);

-- #7 Otomatik zamanlama: admin bir zamana dalga/rapor açma/kapama planlar
CREATE TABLE IF NOT EXISTS scheduled_events (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_type text    NOT NULL CHECK (event_type IN ('wave_open','wave_close','report_open','report_close','prova_off')),
  wave_id    smallint REFERENCES waves(id) ON DELETE CASCADE,
  fire_at    timestamptz NOT NULL,
  fired      bool    DEFAULT false NOT NULL,
  fired_at   timestamptz,
  cancelled  bool    DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS scheduled_events_fire_at_idx ON scheduled_events (fire_at) WHERE fired = false AND cancelled = false;

-- Deny-all RLS (aynı politika: hiç policy yok)
ALTER TABLE audit_log         ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_events  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON audit_log        FROM anon, authenticated;
REVOKE ALL ON scheduled_events FROM anon, authenticated;
