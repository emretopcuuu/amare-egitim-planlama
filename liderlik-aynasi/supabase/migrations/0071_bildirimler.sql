-- BİLDİRİM GELEN KUTUSU — AYNA'nın gönderdiği her bildirim kalıcı saklanır.
-- Push (web-push) anlık gelir ama kaybolur; burada geçmiş + okunmamış sayısı +
-- detay + ilgili bağlantı (görev vb.) tutulur. İsim çipindeki zil okunmamışı
-- gösterir, /bildirimler sayfası hepsini listeler.

create table if not exists public.bildirimler (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(id) on delete cascade,
  baslik text not null,
  govde text not null,
  url text,
  okundu_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists bildirimler_participant_idx
  on public.bildirimler (participant_id, created_at desc);

-- Okunmamış sayımı hızlandır.
create index if not exists bildirimler_okunmamis_idx
  on public.bildirimler (participant_id) where okundu_at is null;

alter table public.bildirimler enable row level security;
revoke all on public.bildirimler from anon, authenticated;
