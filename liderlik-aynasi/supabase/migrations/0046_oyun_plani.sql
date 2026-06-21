-- FAZ A — OYUN PLANI (10/40/90 gün). Ayna Raporu kapanışında AI üretir:
-- hedef + neden + kör nokta + güçlü yanlara göre somut, ufuklara bölünmüş plan.
-- Söz buradan beslenir (aksiyon adımları); 90 gün takibi (Faz B) bunu okur.
create table if not exists public.oyun_plani (
  participant_id uuid primary key references public.participants(id) on delete cascade,
  on_gun jsonb not null default '[]'::jsonb,    -- [{ baslik, aksiyon, olcut }]
  kirk_gun jsonb not null default '[]'::jsonb,
  doksan_gun jsonb not null default '[]'::jsonb,
  ozet text,                                     -- planın 1-2 cümlelik çerçevesi
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.oyun_plani enable row level security;
revoke all on public.oyun_plani from anon, authenticated;
