-- İÇ MESAJLAŞMA — grup arkadaşları arası + katılımcı↔kamp yönetimi (admin) mesajları.
-- Her mesaj alıcıya BİLDİRİM olarak da düşer (bkz. lib/icMesaj.ts → katilimciyaBildir).
-- Modeller:
--   Katılımcı → grup arkadaşı : gonderen_id=A, alici_id=B
--   Katılımcı → yönetim       : gonderen_id=A, admin_hedef=true, alici_id=null
--   Yönetim → katılımcı       : gonderen_id=adminId, gonderen_admin=true, alici_id=B
create table if not exists public.ic_mesajlar (
  id uuid primary key default gen_random_uuid(),
  gonderen_id uuid not null references public.participants(id) on delete cascade,
  gonderen_admin boolean not null default false,
  alici_id uuid references public.participants(id) on delete cascade,
  admin_hedef boolean not null default false,
  govde text not null,
  okundu_at timestamptz,
  created_at timestamptz not null default now(),
  -- En az bir hedef olmalı: ya bir alıcı, ya yönetim.
  constraint ic_mesaj_hedef_chk check (alici_id is not null or admin_hedef)
);

-- Alıcının gelen kutusu / okunmamış sayımı.
create index if not exists ic_mesajlar_alici_idx
  on public.ic_mesajlar (alici_id, created_at desc);
-- Yönetim gelen kutusu (yalnız yönetime gidenler).
create index if not exists ic_mesajlar_admin_idx
  on public.ic_mesajlar (created_at desc) where admin_hedef;
-- Bir kişinin gönderdikleri (sohbet eşlemesi).
create index if not exists ic_mesajlar_gonderen_idx
  on public.ic_mesajlar (gonderen_id, created_at desc);

alter table public.ic_mesajlar enable row level security;
revoke all on public.ic_mesajlar from anon, authenticated;
