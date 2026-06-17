-- GELİŞTİRME #5 — Tanıklı görevler: aday bir görevi tamamlayınca onu YANINDA
-- gören bir ekip arkadaşını tanık gösterebilir. Tanık tek cümlelik gözlemini
-- yazar (adaya anonim görünür). Sosyal sorumluluk + akran aynası + tanıkta da
-- farkındalık. Görev başına bir tanık (mission_id unique).
create table if not exists public.gorev_tanik (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null unique references public.missions(id) on delete cascade,
  doer_id uuid not null references public.participants(id) on delete cascade,
  witness_id uuid not null references public.participants(id) on delete cascade,
  observation text,
  confirmed_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.gorev_tanik enable row level security;
revoke all on public.gorev_tanik from anon, authenticated;
create index if not exists gorev_tanik_witness_idx
  on public.gorev_tanik (witness_id) where confirmed_at is null;
