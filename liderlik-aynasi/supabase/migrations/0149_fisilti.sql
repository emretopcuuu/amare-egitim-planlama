-- G5 — FISILTI POSTASI. Günde 1 fısıltı hakkı (market'ten +1). Kişi seçilir,
-- 15-30 sn GERÇEK sesle söylenir (isimli/anonim). Alıcıya kilitli gelir; 1
-- görev tamamlayınca açılır. Anonimde "Kim söyledi?" tahmin oyunu. Ses GERÇEK
-- kayıt (klon değil) — KVKK saklama/silme kuralına tabi (sesler bucket).
create table if not exists public.fisilti (
  id uuid primary key default gen_random_uuid(),
  gonderen uuid not null references public.participants(id) on delete cascade,
  alici uuid not null references public.participants(id) on delete cascade,
  ses_path text not null,
  anonim boolean not null default false,
  -- Anonimde: tahmin doğruysa gönderenin kimliği açılsın mı?
  bilirse_ogrensin boolean not null default false,
  -- Alıcı henüz görev tamamlamadıysa kilitli.
  kilit boolean not null default true,
  acildi_at timestamptz,          -- alıcı dinledi
  tahmin_dogru boolean,           -- "kim söyledi?" tahmini (anonim) doğru mu
  created_at timestamptz not null default now()
);
create index if not exists fisilti_alici_idx on public.fisilti (alici);
create index if not exists fisilti_gonderen_idx on public.fisilti (gonderen);
alter table public.fisilti enable row level security;
revoke all on public.fisilti from anon, authenticated;
comment on table public.fisilti is
  'G5 fısıltı postası (kilitli sesli takdir + tahmin). Ses KVKK''ya tabi. RLS deny-all.';

-- Görev-dışı kıvılcım kazançları için genel defter (fısıltı tahmini vb.).
-- kazancToplami bunu da toplar → cüzdan+toplam artar; aktiviteyle kazanılır.
create table if not exists public.kivilcim_bonus (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(id) on delete cascade,
  kaynak text not null,
  deger int not null default 0 check (deger >= 0),
  created_at timestamptz not null default now()
);
create index if not exists kivilcim_bonus_participant_idx on public.kivilcim_bonus (participant_id);
alter table public.kivilcim_bonus enable row level security;
revoke all on public.kivilcim_bonus from anon, authenticated;
comment on table public.kivilcim_bonus is
  'Görev-dışı kıvılcım kazançları (fısıltı tahmini vb.); kazancToplami toplar. RLS deny-all.';
