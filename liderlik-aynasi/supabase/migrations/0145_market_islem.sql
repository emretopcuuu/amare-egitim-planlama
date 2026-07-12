-- G1 — ÇİFT CÜZDAN + KIVILCIM MARKETİ. Kıvılcımın stored toplamı YOK; her yerde
-- missions.spark_points toplanır (= kazanç toplamı; unvan/takım/lig bunu okur).
-- Çift cüzdan bu mimariye DOKUNMADAN kurulur:
--   • kivilcim_toplam (kazanç, rank-only) = mevcut missions.spark_points toplamı
--     (+ rozet kıvılcımı) — DEĞİŞMEZ, harcama bunu ASLA düşürmez.
--   • kivilcim_cuzdan (harcanabilir) = kazanç toplamı − market harcamaları.
-- Yani yalnız HARCAMA defterini eklemek yeter: cüzdan = kazanç − harcama.
-- Böylece unvan/takım/lig hesapları hiç değişmez (adalet guardrail'i otomatik).
create table if not exists public.market_islem (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(id) on delete cascade,
  urun_kod text not null,
  reyon text not null,
  tutar int not null check (tutar >= 0),
  -- Fiziksel/prestij ürün mü (kapanışta ad anonsu, ön sıra, Emre ile birebir)?
  -- Fiziksel ürünler admin "teslim edilecek" listesine düşer.
  fiziksel boolean not null default false,
  -- Seçenekli ürünler için (ör. elmas ışık rengi 5 seçenek) seçilen varyant.
  varyant text,
  -- Fiziksel ürünlerde teslim durumu; dijitalde null.
  teslim_durumu text check (teslim_durumu in ('bekliyor', 'teslim')),
  teslim_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists market_islem_participant_idx on public.market_islem (participant_id);
create index if not exists market_islem_teslim_idx on public.market_islem (teslim_durumu)
  where teslim_durumu = 'bekliyor';

alter table public.market_islem enable row level security;
revoke all on public.market_islem from anon, authenticated;
comment on table public.market_islem is
  'G1 kıvılcım market harcama defteri. Cüzdan = kazanç − bu defter. RLS deny-all: yalnız servis rolü.';
