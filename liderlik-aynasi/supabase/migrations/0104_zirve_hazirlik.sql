-- [E1-b] ZİRVEYE HAZIRLIK ön-uçuş satırı. Gün 3 11:00'de (kapanış eğitimi 11:40'ta
-- başlar) orkestratör zirve_hazirlik_kontrol fonksiyonunu çalıştırır: eksik Ayna
-- Mektupları + sesleri son kez üretir, hâlâ eksikse admin'e uyarır. Ayrıca on_kosul
-- = 'raporlar_hazir' olduğu için orkestratör bu satırı ateşlemeden ONUCUS_DK (45)
-- dk önce (≈10:15'ten itibaren) ön-koşulu denetleyip eksikleri üretmeye BAŞLAR —
-- reveal anında 29 telefon aynı anda açsa bile yük olmaz. 'bekliyor' — kamp
-- başlayana dek ateşlenmez.
insert into kamp_senaryosu (olay_kodu, tetik_tipi, gun, saat, eylem_tipi, eylem_hedef, eylem_baslik, eylem_deger, on_kosul, sira) values
  ('zirve_hazirlik', 'kamp_gorelli', 3, 11, 'fonksiyon', 'zirve_hazirlik_kontrol', null, null, 'raporlar_hazir', 95)
on conflict (olay_kodu) do nothing;
