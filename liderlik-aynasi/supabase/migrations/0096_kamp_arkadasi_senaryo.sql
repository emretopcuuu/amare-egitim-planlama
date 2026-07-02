-- FAZ 3 — Bağ ve dönem kapanışları senaryo satırları.
-- [3.1] Kamp arkadaşı: Gün 4 ata; sonra haftalık hatırlatma (Gün 11/18/25/32).
-- [3.2] 31 Temmuz mini-zirve ≈ Gün 15 (17 Tem + 14) — "İlk 10 Gün Raporu" push.
insert into kamp_senaryosu (olay_kodu, tetik_tipi, gun, saat, eylem_tipi, eylem_hedef, eylem_baslik, eylem_deger, sira) values
  ('kamp_arkadasi_ata',      'kamp_gorelli',  4, 10, 'fonksiyon', 'kamp_arkadasi_ata',      null, null, 200),
  ('kamp_arkadasi_hat_h1',   'kamp_gorelli', 11, 10, 'fonksiyon', 'kamp_arkadasi_hatirlat', null, null, 210),
  ('kamp_arkadasi_hat_h2',   'kamp_gorelli', 18, 10, 'fonksiyon', 'kamp_arkadasi_hatirlat', null, null, 211),
  ('kamp_arkadasi_hat_h3',   'kamp_gorelli', 25, 10, 'fonksiyon', 'kamp_arkadasi_hatirlat', null, null, 212),
  ('kamp_arkadasi_hat_h4',   'kamp_gorelli', 32, 10, 'fonksiyon', 'kamp_arkadasi_hatirlat', null, null, 213),
  ('mini_zirve_10gun',       'kamp_gorelli', 15,  9, 'push', 'mini_zirve', 'İlk 10 Gün Raporu', 'İlk 10 günün özeti hazır — sözün, ilk redlerin, serin ve kamp arkadaşın. Bak: /rapor-10gun', 220)
on conflict (olay_kodu) do nothing;
