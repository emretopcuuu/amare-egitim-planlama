-- FAZ 13 (kamp sonrası motor) — 90. GÜN FİNALİ. Eylül Aynası zaten before/after
-- 0-10 öz-ölçümü yapıyor (eylul_aynasi); bu tablo AI'ın ÜRETTİĞİ kapanış
-- mektubunu tutar (mirror_letters ile aynı desen — üretim maliyetli, bir kez).
create table if not exists public.ikinci_ayna (
  participant_id uuid primary key references public.participants(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);
alter table public.ikinci_ayna enable row level security;
revoke all on public.ikinci_ayna from anon, authenticated;
