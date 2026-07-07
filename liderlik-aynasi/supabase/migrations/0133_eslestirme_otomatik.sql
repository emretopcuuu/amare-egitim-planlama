-- [KAMP OTOMASYON] Gözlem eşleştirmelerini orkestratöre bağlar: Gün 2 20:00'de
-- (değerlendirme dalgası 21:00'de açılmadan hemen önce) otomatik "Eksikleri
-- Tamamla" çalışır. Gruplar o ana dek oturmuş olur; herkese grup-içi + grup-dışı
-- gözlem hedefleri atanır. Mevcut atamalara dokunmaz, dışlama listesi korunur.
-- Fonksiyon: lib/eslestirmeOto.ts → orkestratör FONKSIYONLAR['eslestirme_tamamla'].
-- 'bekliyor' — kamp başlayınca akar; admin elle basmasın.
insert into kamp_senaryosu (olay_kodu, tetik_tipi, gun, saat, eylem_tipi, eylem_hedef, eylem_baslik, eylem_deger, sira) values
  ('eslestirme_tamamla', 'kamp_gorelli', 2, 20, 'fonksiyon', 'eslestirme_tamamla', null, null, 70)
on conflict (olay_kodu) do nothing;
