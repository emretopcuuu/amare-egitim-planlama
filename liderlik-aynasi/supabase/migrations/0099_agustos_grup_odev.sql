-- [4.3] AĞUSTOS GRUP ÖDEVİ — Ağustos ortasında (≈ Gün 33) her kamp grubuna
-- isimli "grup-birlikte" ödevi üretilir (lib/kampSonrasi.ts → agustosGrupOdev).
-- Kamp 17 Temmuz'da başlarsa Gün 33 ≈ 18 Ağustos. 'bekliyor' — kamp başlayana
-- dek ateşlenmez.
insert into kamp_senaryosu (olay_kodu, tetik_tipi, gun, saat, eylem_tipi, eylem_hedef, eylem_baslik, eylem_deger, sira) values
  ('agustos_grup_odev', 'kamp_gorelli', 33, 10, 'fonksiyon', 'agustos_grup_odev', null, null, 133)
on conflict (olay_kodu) do nothing;
