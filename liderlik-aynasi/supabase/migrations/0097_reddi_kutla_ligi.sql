-- [4.4] REDDİ KUTLA LİGİ — aylık "En Cesur 10" kutlama push'u (ay sonu).
-- İlk ay sonu ≈ Gün 45 (Ağustos ortası); /red-ligi sayfası sıralamayı gösterir.
-- Pozitif çerçeve: yalnız ilk 10 kutlanır, az reddi olan ifşa edilmez.
insert into kamp_senaryosu (olay_kodu, tetik_tipi, gun, saat, eylem_tipi, eylem_hedef, eylem_baslik, eylem_deger, sira) values
  ('reddi_kutla_ay1', 'kamp_gorelli', 45, 20, 'push', 'red_ligi', '🔥 En Cesur 10', 'Bu ayın en cesur 10''u belli oldu. Sen neredesin? Bak: /red-ligi', 400)
on conflict (olay_kodu) do nothing;
