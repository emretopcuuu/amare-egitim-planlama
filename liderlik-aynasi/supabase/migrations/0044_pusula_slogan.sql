-- Pusula'ya kişisel slogan: damıtma sonrası AI 3 aday üretir, kişi seçer/düzenler.
ALTER TABLE pusula
  ADD COLUMN IF NOT EXISTS slogan text,
  ADD COLUMN IF NOT EXISTS slogan_adaylar jsonb;
