-- FAZ 5.2 — ALTIN GÖREV: günde kamp geneli 2-3 kişiye düşen nadir varyant.
-- Kind'dan bağımsız bir "parlatma" bayrağı — puanlamada 3x kıvılcım verir,
-- akşam /ekran'da isimli kutlanır (bilinçli istisna: bu ifşa değil, ödül).
alter table missions add column if not exists altin boolean not null default false;
