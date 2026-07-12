-- G3 — REKORLAR (kamp kürsüsü). Her kategori için o anki rekortmen + değer
-- saklanır; tarama (lib/rekorlar.ts rekorTara) mevcut verilerden hesaplar,
-- kırılınca herkese push atar. Kişisel rekorlar ayrıca canlı türetilir (tablo
-- gerekmez). Çok kategori → herkes bir şeyde birinci olabilir.
create table if not exists public.rekorlar (
  kategori text primary key,
  participant_id uuid references public.participants(id) on delete set null,
  deger double precision not null,
  tarih timestamptz not null default now()
);
alter table public.rekorlar enable row level security;
revoke all on public.rekorlar from anon, authenticated;
comment on table public.rekorlar is
  'G3 kamp rekorları (kategori başına rekortmen + değer). RLS deny-all.';
