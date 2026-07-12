-- G2 — GİZEMLİ SANDIK. Her 3 puanlanmış görevde bir sandık hakkı doğar; kişi
-- açar, ağırlıklı rastgele ödül çıkar (ASLA boş/ceza). Rastgelelik SUNUCUDA;
-- istemciye ödül tablosu sızmaz. Bu tablo hem "kaç sandık açıldı" (hak hesabı)
-- hem koleksiyon (ayna kartı/rozet) hem kazanılan kıvılcım kaydıdır.
-- deger = kazanılan kıvılcım (kivilcim/gizli_gorev/altin türlerinde > 0); ayna
-- kartı/rozet gibi kozmetik ödüllerde 0. Kıvılcım kazancı G1 cüzdan+toplamına
-- akar (lib/market.ts kazancToplami bu tablonun deger'ini de toplar).
create table if not exists public.sandik_gecmisi (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(id) on delete cascade,
  tur text not null check (tur in ('kivilcim', 'ayna_karti', 'gizli_gorev', 'rozet', 'altin')),
  deger int not null default 0 check (deger >= 0),
  -- Kozmetik ödül ayrıntısı (ayna kartı metni/kaynağı, rozet adı vb.).
  meta jsonb not null default '{}'::jsonb,
  acildi_at timestamptz not null default now()
);
create index if not exists sandik_gecmisi_participant_idx on public.sandik_gecmisi (participant_id);

alter table public.sandik_gecmisi enable row level security;
revoke all on public.sandik_gecmisi from anon, authenticated;
comment on table public.sandik_gecmisi is
  'G2 gizemli sandık geçmişi (hak hesabı + koleksiyon + kıvılcım kaydı). RLS deny-all.';
