-- 90 GÜN PROTOKOLÜ — kişiye atanmış pratikler + tamamlama + Artı Üç sayacı.
-- Additive; RLS deny-all (tüm erişim service-role sunucu tarafı, diğer tablolarla aynı).

-- Kişinin aktif pratikleri (ilk kurulumda kişiselleştirme kuralıyla yazılır).
create table if not exists public.protokol_pratik (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(id),
  pratik_kodu text not null,
  cekirdek boolean not null default false,     -- çekirdek mi, kişisel mi
  kapatildi boolean not null default false,    -- "bana göre değil" ile kapatıldıysa
  created_at timestamptz not null default now(),
  unique (participant_id, pratik_kodu)
);
create index if not exists protokol_pratik_pid_idx on public.protokol_pratik (participant_id);
alter table public.protokol_pratik enable row level security;

-- Tamamlama kayıtları (seri + geri okuma için).
create table if not exists public.protokol_tamamlama (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(id),
  pratik_kodu text not null,
  tarih date not null,
  created_at timestamptz not null default now(),
  unique (participant_id, pratik_kodu, tarih)
);
create index if not exists protokol_tamamlama_pid_idx on public.protokol_tamamlama (participant_id, tarih);
alter table public.protokol_tamamlama enable row level security;

-- P6 "Artı Üç" sayacı — İSİM GİRİLMEZ, yalnız gün + adet (KVKK + düşük sürtünme).
create table if not exists public.liste_sayaci (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(id),
  tarih date not null,
  adet integer not null default 0,
  unique (participant_id, tarih)
);
alter table public.liste_sayaci enable row level security;
