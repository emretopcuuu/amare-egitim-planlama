-- #10 KAMP TAAHHÜT DEFTERİ: görev dönüşlerindeki SOMUT iş taahhütleri ("pazartesi
-- 3 kişiyi arayacağım", "2 randevu alacağım") serbest metinde kayboluyordu.
-- Yapılandırılmış yakalanır → Gün 3 SÖZ'ü ve 90-gün planı bu sayılara bağlanır +
-- kapanışta kolektif an ("bu salon N görüşme sözü verdi"). Admin-only (deny-all).
create table if not exists kamp_taahhut (
  id bigint generated always as identity primary key,
  participant_id uuid not null references participants(id) on delete cascade,
  mission_id uuid,                  -- hangi görev dönüşünden çıktı (opsiyonel)
  tur text not null default 'diger'
    check (tur in ('gorusme','arama','randevu','liste','kayit','diger')),
  sayi int,                          -- taahhüt edilen adet (varsa)
  ozet text not null,                -- taahhüdün kısa cümlesi
  created_at timestamptz not null default now()
);
create index if not exists kamp_taahhut_kisi_idx on kamp_taahhut (participant_id, created_at desc);
create index if not exists kamp_taahhut_zaman_idx on kamp_taahhut (created_at desc);
alter table kamp_taahhut enable row level security;
