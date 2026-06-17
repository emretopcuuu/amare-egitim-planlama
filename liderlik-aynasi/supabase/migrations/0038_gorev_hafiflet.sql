-- GELİŞTİRME #8 — Duygusal güvenlik. Aday bir görevi "bu bana ağır geldi"
-- diyerek hafifletebilir; AYNA şefkatle daha küçük bir varyant verir. lightened_at,
-- sonraki görevlerin bir süre nazik kalması için sinyaldir (kaçınma zekâsı).
alter table public.missions
  add column if not exists lightened_at timestamptz;
