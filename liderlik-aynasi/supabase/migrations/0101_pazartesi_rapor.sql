-- [6.1] PAZARTESİ KOMUTA RAPORU — orkestratör her post-camp pazartesi 09:00'da
-- adminlere haftalık kohort özeti bildirir (lib/kapanisPanel.ts →
-- pazartesiRaporuGonder). Kamp 17 Temmuz 2026 Cuma başlar → pazartesiler Gün
-- 4/11/18/25/32/39/46/53/60. Hepsi 'bekliyor'; kamp başlayana dek ateşlenmez.
insert into kamp_senaryosu (olay_kodu, tetik_tipi, gun, saat, eylem_tipi, eylem_hedef, eylem_baslik, eylem_deger, sira) values
  ('pazartesi_rapor_g4',  'kamp_gorelli',  4, 9, 'fonksiyon', 'pazartesi_rapor', null, null, 200),
  ('pazartesi_rapor_g11', 'kamp_gorelli', 11, 9, 'fonksiyon', 'pazartesi_rapor', null, null, 201),
  ('pazartesi_rapor_g18', 'kamp_gorelli', 18, 9, 'fonksiyon', 'pazartesi_rapor', null, null, 202),
  ('pazartesi_rapor_g25', 'kamp_gorelli', 25, 9, 'fonksiyon', 'pazartesi_rapor', null, null, 203),
  ('pazartesi_rapor_g32', 'kamp_gorelli', 32, 9, 'fonksiyon', 'pazartesi_rapor', null, null, 204),
  ('pazartesi_rapor_g39', 'kamp_gorelli', 39, 9, 'fonksiyon', 'pazartesi_rapor', null, null, 205),
  ('pazartesi_rapor_g46', 'kamp_gorelli', 46, 9, 'fonksiyon', 'pazartesi_rapor', null, null, 206),
  ('pazartesi_rapor_g53', 'kamp_gorelli', 53, 9, 'fonksiyon', 'pazartesi_rapor', null, null, 207),
  ('pazartesi_rapor_g60', 'kamp_gorelli', 60, 9, 'fonksiyon', 'pazartesi_rapor', null, null, 208)
on conflict (olay_kodu) do nothing;
