-- FAZ 3 — EŞLEŞME WOW KATMANI. baglanti_id: 2 veya 3 mission'ı birbirine
-- bağlayan paylaşılan kimlik (çift taraflı gizli görev [3.1], tanık görevi
-- [3.3], üçlü mini-konsey [3.4]). Tarafların kim olduğu görev metninde asla
-- ele verilmez — yalnız /api/gorev-yanit'in reveal mantığı bu kolonu okur.
-- zincir_id/zincir_sira: kamp zinciri [3.5] — bir mesajı taşıyan halkalar.
alter table missions add column if not exists baglanti_id uuid;
alter table missions add column if not exists zincir_id uuid;
alter table missions add column if not exists zincir_sira integer;

create index if not exists missions_baglanti_idx on missions (baglanti_id) where baglanti_id is not null;
create index if not exists missions_zincir_idx on missions (zincir_id) where zincir_id is not null;
