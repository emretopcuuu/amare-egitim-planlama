-- Öneri #7 — DÖNÜŞ BİÇİMİ çeşitliliği. Görevin kişiden istediği dönüş türü
-- (yaz/sesli/grup/foto/tek_kelime) missions'a kaydedilir; görev üretimi son N
-- görevin biçimini görüp tekdüzeliği kırar (bağlama "sonDonusBicimleri" gider).
-- Nullable: eski görevler + on-demand üretimler biçimsiz kalabilir (sorunsuz).
alter table missions add column if not exists donus_bicimi text;
