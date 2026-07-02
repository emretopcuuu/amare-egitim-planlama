-- FAZ 1.1 — SOMUTLUK ŞABLONU: her görev kim/ne/nerede/ne_zaman/kanit alanlarına
-- ayrıştırılır (görev gövdesinden çıkarılır, uydurulmaz) ve UI'da 5 satırlık
-- checklist olarak gösterilir.
alter table missions add column if not exists somutluk jsonb;
