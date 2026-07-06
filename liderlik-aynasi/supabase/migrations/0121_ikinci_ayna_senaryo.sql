-- FAZ 13 (kamp sonrası motor #20) — 90. Gün Finali: Dalga 4 davetinden (Gün 90
-- 10:00) 1 saat sonra İkinci Ayna penceresi açılır (fonksiyon: ikinci_ayna_daveti,
-- lib/orkestrator.ts FONKSIYONLAR kaydında). Toplu üretim yapmaz, yalnız
-- pencereyi açar + davet push'u; asıl üretim kişi /ikinci-ayna'yı açtığında olur.
insert into kamp_senaryosu (olay_kodu, tetik_tipi, gun, saat, eylem_tipi, eylem_hedef, eylem_baslik, eylem_deger, sira) values
  ('ikinci_ayna_daveti', 'kamp_gorelli', 90, 11, 'fonksiyon', 'ikinci_ayna_daveti', null, null, 161)
on conflict (olay_kodu) do nothing;
