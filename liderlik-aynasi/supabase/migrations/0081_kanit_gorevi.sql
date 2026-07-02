-- KANIT GARANTİSİ — mikro gözlem görevi izleme tablosu.
-- Gün 2 akşamı, kanıtsız (takdir+yorum+gözlem < eşik) kişiler için akranlarına
-- "X'i gözle, güçlü yanını takdir olarak gönder" görevi (kind='gozlem') üretilir.
-- Görev tamamlanınca yanıt HEDEFE takdir (kudos) olarak yazılır → hedefin kanıt
-- sayacı garanti yükselir, Boşluk Anı içi boş kalmaz.
-- Bu tablo görev↔hedef eşleşmesini tutar (mentorluk_kayit deseni).
create table if not exists kanit_gorevi (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references missions(id) on delete cascade,
  gozlemci_id uuid not null references participants(id) on delete cascade,
  hedef_id uuid not null references participants(id) on delete cascade,
  hedef_ad text not null,
  -- görev puanlanınca takdir yazıldı mı (çift takdir guard'ı)
  takdir_yazildi_at timestamptz,
  created_at timestamptz not null default now(),
  unique (mission_id)
);

create index if not exists kanit_gorevi_hedef on kanit_gorevi (hedef_id);
create index if not exists kanit_gorevi_gozlemci on kanit_gorevi (gozlemci_id);

-- Deny-all erişim modeli (diğer tablolarla tutarlı): RLS açık, policy yok.
alter table kanit_gorevi enable row level security;
revoke all on kanit_gorevi from anon, authenticated;
