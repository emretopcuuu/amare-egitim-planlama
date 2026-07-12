-- G4 — ÇİFT SERİSİ (snapstreak). Kamp arkadaşı grubundaki HERKES aynı gün en az
-- bir anlamlı eylem yaparsa ortak alev +1. Bozulursa alev söner ama KÜL kalır
-- (gun_sayisi silinmez); 3 gün üst üste ikisi de beslerse alev külden yeniden
-- doğar, eski sayının yarısından. GUARDRAIL: tam sıfırlama YOK (kitle küsmesin);
-- besleme daveti nazik, suçlama değil.
create table if not exists public.cift_serisi (
  id uuid primary key default gen_random_uuid(),
  arkadasi_id uuid not null unique references public.kamp_arkadasi(id) on delete cascade,
  gun_sayisi int not null default 0,
  son_besleme date,
  kul boolean not null default false,
  -- Kül modunda üst üste kaç gün beslendi (3'te yeniden doğar).
  kul_gun_sayac int not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.cift_serisi enable row level security;
revoke all on public.cift_serisi from anon, authenticated;
comment on table public.cift_serisi is
  'G4 çift serisi (kamp arkadaşı grubu ortak alev). RLS deny-all.';
