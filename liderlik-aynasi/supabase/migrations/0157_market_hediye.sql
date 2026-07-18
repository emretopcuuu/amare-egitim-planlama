-- C3 — Hediye rafı. market_islem'e opsiyonel alıcı (hediye edilen kişi).
-- Additive + nullable: normal alımlar etkilenmez (hediye_alici_id = null).
alter table public.market_islem add column if not exists hediye_alici_id uuid references public.participants(id);
