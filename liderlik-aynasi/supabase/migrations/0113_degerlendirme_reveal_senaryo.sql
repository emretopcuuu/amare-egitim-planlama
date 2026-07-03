-- [KAMP OTOMASYON] Kamp değerlendirmesi + reveal'i orkestratöre bağlar
-- (İstanbul-çıpalı, elle dokunuş gerekmez). Fonksiyonlar lib/kampDegerlendirme.ts;
-- orkestratör FONKSIYONLAR kaydına eklendi. Hepsi 'bekliyor' — kamp başlayınca akar.
--   • Gün 2 21:00 — değerlendirme dalgası açılır + "herkesi puanla" push
--   • Gün 3 09:00 — tamamlamayanlara WhatsApp + push dürtme
--   • Gün 3 13:00 — reveal GÜVENLİK AĞI (host sahneden elle açmadıysa; açtıysa
--                    idempotent atlar). Asıl reveal host'un elinde.
insert into kamp_senaryosu (olay_kodu, tetik_tipi, gun, saat, eylem_tipi, eylem_hedef, eylem_baslik, eylem_deger, sira) values
  ('degerlendirme_ac',       'kamp_gorelli', 2, 21, 'fonksiyon', 'degerlendirme_ac',       null, null, 75),
  ('degerlendirme_hatirlat', 'kamp_gorelli', 3,  9, 'fonksiyon', 'degerlendirme_hatirlat', null, null, 92),
  ('reveal_ac',              'kamp_gorelli', 3, 13, 'fonksiyon', 'reveal_ac',              null, null, 99)
on conflict (olay_kodu) do nothing;
