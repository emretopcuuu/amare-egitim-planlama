-- [FAZ A — Hands-free otomasyon] İki boşluğu kapatır:
--
-- B1) MÜHÜR penceresi (muhur_acik) artık orkestratörle OTOMATİK açılır — Gün 3
--     13:00, reveal ile AYNI anda (tr.ts'teki "Mühür'ü raporlarla aynı anda aç"
--     belgeli niyeti). Admin elle açmak zorunda kalmaz. sira 98 → reveal'den
--     (99) hemen önce. Not: bu, kişinin mühürlü sözünün reveal'de gösterildiği
--     penceredir; kamp KAPANIŞ söz finali (soz_v2) DEĞİL — o bilinçli manuel kalır.
--
-- B3) DALGA 4 "90 Gün Sonra" daveti EMEKLİYE ayrılır. 90. günün finali artık
--     İkinci Ayna mektubu (ikinci_ayna_daveti). Dalga 4 push'u mükerrer/kafa
--     karıştırıcı bir ikinci final yaratıyordu → senaryo satırı kaldırılır.
--     (waves tablosundaki id=4 satırı hiçbir yerde açılmadığı için inert; dursa
--     da zarar vermez, temiz reset'te tamamen düşürülebilir.)
--
-- kamp_senaryosu.olay_kodu UNIQUE → insert idempotent (on conflict do nothing).
-- Reset (0102/0103/0109) bu satırları silmez, yalnız durum='bekliyor'e çeker;
-- o yüzden buradaki insert/delete reset'ten sağ çıkar.

insert into kamp_senaryosu (olay_kodu, tetik_tipi, gun, saat, eylem_tipi, eylem_hedef, eylem_baslik, eylem_deger, sira) values
  ('muhur_ac', 'kamp_gorelli', 3, 13, 'ayar_ac', 'muhur_acik', null, 'true', 98)
on conflict (olay_kodu) do nothing;

delete from kamp_senaryosu where olay_kodu = 'dalga4_daveti';
