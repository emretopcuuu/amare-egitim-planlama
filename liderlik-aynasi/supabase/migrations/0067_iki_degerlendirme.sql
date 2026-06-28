-- Değerlendirme pencerelerini 4'ten 2'ye indir.
-- Karar gerekçesi: 3 günlük kampta katılımcılar aynı aktiviteleri birlikte
-- yaşıyor; "ilk izlenim → gözlem → gerçek algı" şeklinde 3 ayrı tur, gürültüden
-- başka bir şey üretmiyordu. Kapanış töreni Gün 3 öğleni olduğu için tek bir
-- "Kamp Değerlendirmesi" (tören öncesi açılır) yeterli. "90 Gün Sonra" turu
-- kamp sonrası değişim ölçümü için korunur.
--
-- ID'ler bilinçli korunuyor: id=4 (90 Gün Sonra) davet akışına (settings
-- wave4_davet_gonderildi, /admin/davetler) ve id=1 ekran sinematiğine
-- (public/dalga/dalga-1.mp4) bağlı. Bu yüzden 2 ve 3 silinir, 1 yeniden
-- adlandırılır, 4 olduğu gibi kalır.

-- Rating yoksa güvenli; varsa önce onları temizle (FK ratings.wave → waves.id).
delete from public.ratings where wave in (2, 3);
delete from public.waves where id in (2, 3);

update public.waves set name = 'Kamp Değerlendirmesi' where id = 1;
update public.waves set name = '90 Gün Sonra' where id = 4;
