-- #9 — MENTORLUK GRAFİĞİ & TAKİBİ. Mentorluk görevi her gün 3 aday önerir;
-- bunu bir kayda bağlarız: kim kime önerildi, hangisini SEÇTİ, konuşma oldu mu.
-- Zamanla bir mentor-mentee ağı çıkar (sosyal sermaye ölçümü).

CREATE TABLE IF NOT EXISTS public.mentorluk_kayit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mentee_id uuid NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  mission_id uuid REFERENCES public.missions(id) ON DELETE SET NULL,
  aday_idler uuid[] NOT NULL DEFAULT '{}',
  secilen_id uuid REFERENCES public.participants(id) ON DELETE SET NULL,
  konustu boolean NOT NULL DEFAULT false,
  gun smallint,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mentorluk_mentee ON public.mentorluk_kayit(mentee_id);
CREATE INDEX IF NOT EXISTS idx_mentorluk_secilen ON public.mentorluk_kayit(secilen_id);
CREATE INDEX IF NOT EXISTS idx_mentorluk_mission ON public.mentorluk_kayit(mission_id);

-- Derinlemesine savunma: deny-all RLS (anon/authenticated erişemez; tüm erişim
-- sunucu service-role üzerinden).
ALTER TABLE public.mentorluk_kayit ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.mentorluk_kayit IS
  'Mentorluk görevi takibi: önerilen adaylar, seçilen mentor, konuşma oldu mu';
