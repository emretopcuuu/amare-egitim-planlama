-- GELİŞTİRME #1 — Yansıma Kapanışı: görev puanlandıktan sonra adaydan tek
-- cümlelik bir iç-yansıma alınır; AYNA bunu okuyup kör noktayla sessiz bağ
-- kurarak tek cümlede geri yansıtır. Farkındalık tam burada doğar.
alter table public.missions
  add column if not exists reflection_text text,
  add column if not exists reflection_reply text,
  add column if not exists reflected_at timestamptz;
