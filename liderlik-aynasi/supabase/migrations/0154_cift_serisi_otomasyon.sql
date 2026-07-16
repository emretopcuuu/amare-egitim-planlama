-- Çift Serisi (snapstreak) kamp İÇİNDE değil, kamp SONRASI bir özellik —
-- "kamp arkadaşı" gruplarına bağlı, o gruplar Gün 4'te (kamp_arkadasi_ata)
-- atanıyor. Bu yüzden Gün 4, saat 11 — atamadan hemen sonra — açılıyor.

insert into kamp_senaryosu
  (olay_kodu, tetik_tipi, gun, saat, eylem_tipi, eylem_hedef, eylem_baslik, eylem_deger, durum, sira)
values
  ('gun4_cift_serisi_ac', 'kamp_gorelli', 4, 11, 'ayar_ac', 'cift_serisi_acik', null, null, 'bekliyor', 214),
  ('gun4_cift_serisi_duyuru', 'kamp_gorelli', 4, 11, 'push', 'cift_serisi_duyuru',
   '🔥 Çift Serisi açıldı',
   'Kamp arkadaşınla aynı gün ikiniz de bir şey yaparsanız ortak alev büyür. Söner ama küle döner — 3 gün üst üste beslerseniz yarısından yeniden doğar.',
   'bekliyor', 215);
