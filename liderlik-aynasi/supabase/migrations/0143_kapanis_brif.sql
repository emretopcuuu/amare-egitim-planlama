-- KAPANIŞ — "SALONUN RÖNTGENİ": Emre'nin sahne öncesi hazırlık brifi.
-- Gün 3'te iki teslim: 'on' (07:30, tüm kamp deneyiminden damıtılmış ana brif)
-- ve 'final' (11:20, Gün 3 liderlik değerlendirmesi kapandıktan sonra güncellenmiş
-- sürüm, sahneden ~20 dk önce). Üretim tik'ten yayından ~20 dk önce tetiklenir;
-- unique(tarih,slot) tekrarlı/yarışan tikleri idempotent yapar. AI düşerse
-- şablon metin fallback — brif asla boş kalmaz. Admin panelinden elle de üretilir.
create table if not exists public.kapanis_brif (
  id uuid primary key default gen_random_uuid(),
  tarih date not null,
  slot text not null check (slot in ('on','final','manuel')),
  gun int,
  -- Yapılandırılmış brif verisi (sayılar, isimsiz alıntılar, dokunulacaklar listesi).
  veri jsonb not null default '{}'::jsonb,
  -- AI ile damıtılmış, Emre'nin sahne öncesi okuyacağı düzyazı brif (isimsiz).
  metin text not null,
  durum text not null default 'hazir' check (durum in ('hazir')),
  created_at timestamptz not null default now(),
  unique (tarih, slot)
);
alter table public.kapanis_brif enable row level security;
comment on table public.kapanis_brif is
  'Kapanış "Salonun Röntgeni" sahne öncesi brifi. RLS deny-all: yalnız servis rolü.';
