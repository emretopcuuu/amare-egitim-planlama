-- [FAZ A · B2] BOŞLUK ANI otomatik açılır. Gün 3 · 14:00 — reveal'den (13:00) 1
-- saat sonra, kendi başına bir an (çift-push çakışması olmasın; wave kapandığı
-- için kanıt tam). Fonksiyon eylemi (bosluk_ac) hem bosluk_acik bayrağını açar
-- hem herkese keşif push'u atar ("telefonda kişisel an"). /bosluk kendi kendini
-- gate'ler: kanıtı olmayan sakin bir mesaj görür (boş an riski yok).
-- olay_kodu UNIQUE → idempotent. Reset kamp_senaryosu'yu silmez (durum='bekliyor').
insert into kamp_senaryosu (olay_kodu, tetik_tipi, gun, saat, eylem_tipi, eylem_hedef, eylem_baslik, eylem_deger, sira) values
  ('bosluk_ac', 'kamp_gorelli', 3, 14, 'fonksiyon', 'bosluk_ac', null, null, 105)
on conflict (olay_kodu) do nothing;
