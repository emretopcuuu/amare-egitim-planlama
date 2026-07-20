-- A5 — Takdir mühürleri. kudos'a opsiyonel kategori (mühür) kolonu.
-- Additive + nullable: mevcut takdirler etkilenmez (kategori = null → "mühürsüz").
alter table public.kudos add column if not exists kategori text;
