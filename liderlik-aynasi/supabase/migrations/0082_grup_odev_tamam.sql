-- GRUP ÖDEVİ GERİ BESLEME DÖNGÜSÜ (öneri #4).
-- Grup ödevi şu ana dek yalnız METİN olarak gösteriliyordu — yanıt/puan/kıvılcım
-- yoktu (çıkmaz sokak). Bu tablo grubun "biz bunu yaptık" kapanışını + kısa
-- kanıtı tutar. Kapanınca gruptaki HERKESE toplu kıvılcım (senkron görev deseniyle)
-- yazılır → kolektif başarı hissi + motor davranışı pekiştirir.
create table if not exists grup_odev_tamam (
  id uuid primary key default gen_random_uuid(),
  odev_id uuid not null references grup_odev(id) on delete cascade,
  kapatan_id uuid not null references participants(id) on delete cascade,
  kanit text not null,
  created_at timestamptz not null default now(),
  unique (odev_id)
);

create index if not exists grup_odev_tamam_odev on grup_odev_tamam (odev_id);

alter table grup_odev_tamam enable row level security;
revoke all on grup_odev_tamam from anon, authenticated;
