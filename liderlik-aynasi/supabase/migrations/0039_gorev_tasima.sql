-- GELİŞTİRME #9 — Taahhüt köprüsü. Aday bir görevin yansımasını "90 güne taşı"
-- diyerek kamp sonrası planına aktarır. carried_at dolu görevlerin reflection_text'i
-- /plan sayfasında "Kamptan Taşıdıklarım" olarak görünür.
alter table public.missions
  add column if not exists carried_at timestamptz;
