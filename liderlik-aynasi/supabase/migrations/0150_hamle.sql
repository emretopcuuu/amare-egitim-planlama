-- G6 — HAMLE SIRASI (karşılıklılık borcu + kilitli reveal). Eşleşmeli görevde
-- (bag/sahit) A tamamlayıp konuşmadan bir cümle yazınca, B'ye "hamle sırası
-- sende" düşer: B kendi tarafını yazınca İKİSİ de karşı cümleyi görür (karşılıklı
-- reveal) + kıvılcım. B yazmazsa A'nın cümlesi B'ye KİLİTLİ kalır. Suçlama yok —
-- yazmamak sessizce geçer, yalnız 20:30 tek nazik hatırlatma.
create table if not exists public.hamle (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null unique references public.missions(id) on delete cascade,
  kaynak_id uuid not null references public.participants(id) on delete cascade,
  hedef_id uuid not null references public.participants(id) on delete cascade,
  kaynak_cumle text not null,
  hedef_cumle text,
  hedef_yanit_at timestamptz,
  sure_bitis timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists hamle_hedef_idx on public.hamle (hedef_id);
create index if not exists hamle_kaynak_idx on public.hamle (kaynak_id);
alter table public.hamle enable row level security;
revoke all on public.hamle from anon, authenticated;
comment on table public.hamle is
  'G6 hamle sırası (karşılıklı kilitli reveal). RLS deny-all.';
