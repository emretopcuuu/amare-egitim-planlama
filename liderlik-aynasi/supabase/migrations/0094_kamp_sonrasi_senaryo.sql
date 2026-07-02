-- FAZ 2 — KAMP SONRASI RİTİM: orkestratör senaryosunu 90 güne uzatır [2.5].
-- Tüm göreli zamanlar ayna_baslangic'tan (Gün N = başlangıç + (N-1) gün).
-- Kamp 3 gün (Gün 1-3); 21 Temmuz ≈ Gün 5. Hepsi 'bekliyor' — kamp başlayana dek
-- ateşlenmez. Emre /admin/senaryo'dan düzenleyebilir/erteleyebilir.
insert into kamp_senaryosu (olay_kodu, tetik_tipi, gun, saat, eylem_tipi, eylem_hedef, eylem_baslik, eylem_deger, sira) values
  -- [2.1] 24 saat sessizlik: Gün 3 13:00 üretim durur, Gün 5 09:00 devam + yolculuk modu
  ('kapanis_sessizlik_basla', 'kamp_gorelli', 3, 13, 'ayar_ac',    'gorev_uretimi_durduruldu', null, 'true',     100),
  ('yolculuk_moduna_gec',     'kamp_gorelli', 5,  9, 'ayar_ac',    'sistem_modu',              null, 'yolculuk', 110),
  ('kapanis_sessizlik_bitir', 'kamp_gorelli', 5,  9, 'ayar_kapat', 'gorev_uretimi_durduruldu', null, null,       111),
  -- [2.2] 72 saat protokolü: Gün 5-6-7 09:00 birer mikro görev (fonksiyon)
  ('p72_gun1', 'kamp_gorelli', 5, 9, 'fonksiyon', 'p72_gun1', null, null, 120),
  ('p72_gun2', 'kamp_gorelli', 6, 9, 'fonksiyon', 'p72_gun2', null, null, 121),
  ('p72_gun3', 'kamp_gorelli', 7, 9, 'fonksiyon', 'p72_gun3', null, null, 122),
  -- [2.4] Ödev paketleri: 10. gün, 15. gün, Ağustos (~Gün 32)
  ('odev_10gun',  'kamp_gorelli', 10, 9, 'fonksiyon', 'odev_10gun',  null, null, 130),
  ('odev_15gun',  'kamp_gorelli', 15, 9, 'fonksiyon', 'odev_15gun',  null, null, 131),
  ('agustos_odev','kamp_gorelli', 32, 9, 'fonksiyon', 'agustos_odev',null, null, 132),
  -- [2.5] 90 günlük dönem işaretleri (FAZ 4-5 mekanikleri bu bayrakları/pushları okur)
  ('muhur30_ac',        'kamp_gorelli', 31, 10, 'ayar_ac', 'muhur_plus30_acik', null, 'true', 140),
  ('halka40_kapanis',   'kamp_gorelli', 42,  9, 'push',    'halka40',           '🔵 40 Gün Halkası', 'Halkanı gördün mü? Bugün kapanış günü — kaç dilim doldu?', 141),
  ('eylul_kanit_modu',  'kamp_gorelli', 45,  9, 'ayar_ac', 'eylul_kanit_modu',  null, 'true', 150),
  ('dalga4_daveti',     'kamp_gorelli', 90, 10, 'push',    'dalga4',            '🌊 Dalga 4', '90 gün doldu. Kim olduğunu görmeye hazır mısın? Aynan seni bekliyor.', 160)
on conflict (olay_kodu) do nothing;
