-- GELİŞTİRME #3 — Ayna Anı: AYNA, adayın kamp ÖNCESİ kendi yazdığı kör nokta
-- cümlesini, kampta yaptıklarıyla yüzleştirip tek bir "gördün mü?" anında geri
-- yansıtır. Kişi başına en fazla bir an (unique); görüldüğünde seen_at dolar.
create table if not exists public.mirror_moments (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null unique references public.participants(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  seen_at timestamptz
);
alter table public.mirror_moments enable row level security;
revoke all on public.mirror_moments from anon, authenticated;
