-- Özellik 6 + 7 + 10 — Çekirdek Neden Nabzı, Zorluk Merdiveni, Dönüşüm Karşılaştırması.
--
-- (6) missions.neden_nabiz: her 5. puanlanan görevden sonra sorulan tek soru —
--     "bu görev seni çekirdek nedenine yaklaştırdı mı?" (1-5). Motor son 3
--     cevabın ortalamasını okuyup düşen trendde yön değiştirir.
-- (7) missions.kas: gorevUret'in deterministik seçtiği lider kası (KAS_DONGU) —
--     kişi × kas bazında konfor sınırını öğrenmek için insert'te yazılır.
--     missions.zorluk_ayar: kişi görevi hafifletti/zorlaştırdı izi
--     ('hafifletildi' | 'zorlastirildi') — merdiven sinyalinin girdisi.
--     missions.zorluk_seviye: modelin kendi değerlendirmesiyle görevin dozu
--     (1-5) — ölçüm/kalibrasyon için saklanır.
-- (10) participants.donusum_karsilastirma: mühür ekranındaki "Gün 1 sen vs
--     Gün 3 sen" karşılaştırmasının önbelleği ({ilkAlinti, sonAlinti, fark}) —
--     bir kez üretilir, yeniden üretilmez.

alter table missions add column if not exists neden_nabiz smallint
  constraint missions_neden_nabiz_araligi check (neden_nabiz between 1 and 5);

alter table missions add column if not exists kas text;

alter table missions add column if not exists zorluk_ayar text
  constraint missions_zorluk_ayar_gecerli check (zorluk_ayar in ('hafifletildi', 'zorlastirildi'));

alter table missions add column if not exists zorluk_seviye smallint
  constraint missions_zorluk_seviye_araligi check (zorluk_seviye between 1 and 5);

alter table participants add column if not exists donusum_karsilastirma jsonb;
