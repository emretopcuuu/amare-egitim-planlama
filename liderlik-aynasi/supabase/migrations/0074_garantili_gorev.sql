-- GARANTİLİ GÖREVLER — kamp boyunca HER katılımcıya tam bir kez verilmesi
-- garanti edilen küratörlü "wow" görevleri (lib/garantiliGorevler.ts). Bu tablo
-- "kime hangi garantili görev verildi"yi tutar; motor (lib/tik.ts) verilmemiş
-- olanı, kişi boştayken ve aralık dolunca verir. (participant_id, kod) tekil →
-- aynı görev aynı kişiye iki kez gitmez.
create table if not exists public.garantili_gorev_kayit (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(id) on delete cascade,
  kod text not null,
  mission_id uuid references public.missions(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (participant_id, kod)
);

create index if not exists garantili_gorev_participant_idx
  on public.garantili_gorev_kayit (participant_id, created_at desc);

alter table public.garantili_gorev_kayit enable row level security;
revoke all on public.garantili_gorev_kayit from anon, authenticated;
