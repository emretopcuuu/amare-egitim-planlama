-- G8 — KAYIP EŞYA BÜROSU (ARG/keşif). Haftada 1, sistemin içinde gizli parlayan
-- bir nokta saklanır (rastgele bir sayfanın köşesi). 3 aşamalı farkındalık:
-- (1) AYNA mit-duyurusu, (2) ilk bulan → HERKESE push + 24 saat pay penceresi,
-- (3) 48 saat bulunmazsa ipucu. GUARDRAIL: kumar değil (bulan hep kazanır,
-- ceza yok), gönüllü keşif.
create table if not exists public.kayip_esya (
  id uuid primary key default gen_random_uuid(),
  hafta text not null,                 -- tur etiketi (tarih vb.)
  konum text not null,                 -- parlayan noktanın saklandığı rota
  ipucu text not null default 'İpucu: geçmişinin durduğu yer.',
  bulan_ilk uuid references public.participants(id) on delete set null,
  bulundu_at timestamptz,
  myth_at timestamptz,                 -- mit-duyurusu gönderildi
  ipucu_at timestamptz,                -- ipucu gönderildi
  durum text not null default 'gizli' check (durum in ('gizli', 'bulundu', 'bitti')),
  created_at timestamptz not null default now()
);
create index if not exists kayip_esya_durum_idx on public.kayip_esya (durum);
alter table public.kayip_esya enable row level security;
revoke all on public.kayip_esya from anon, authenticated;
comment on table public.kayip_esya is 'G8 kayıp eşya turları (ARG). RLS deny-all.';

create table if not exists public.kayip_esya_pay (
  id uuid primary key default gen_random_uuid(),
  kayip_id uuid not null references public.kayip_esya(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  deger int not null default 0,
  ilk boolean not null default false,
  at timestamptz not null default now(),
  unique (kayip_id, participant_id)
);
alter table public.kayip_esya_pay enable row level security;
revoke all on public.kayip_esya_pay from anon, authenticated;
comment on table public.kayip_esya_pay is
  'G8 kayıp eşya pay dağıtımı (ilk bulan + 24s içinde dokunan). kazancToplami kivilcim_bonus toplar; buradaki paylar kivilcim_bonus''a da yazılır.';
