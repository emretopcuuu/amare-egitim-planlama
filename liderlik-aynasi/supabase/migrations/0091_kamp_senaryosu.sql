-- FAZ 9 — OTOMATİK KAMP ORKESTRATÖRÜ (çekirdek).
-- Kampın tüm otomasyonu senaryo SATIRLARI olarak burada durur. Orkestratör
-- (/api/tik → lib/orkestrator.ts) her atışta zamanı gelmiş 'bekliyor' satırları
-- İDEMPOTENT işler: her satır bir kez ateşlenir (durum → 'atesledi'), audit_log'a
-- yazılır. Ateşleme = bir settings bayrağını çevirmek / herkese push / adlandırılmış
-- bir fonksiyonu çağırmak. Tüm göreli zamanlar ayna_baslangic'tan hesaplanır —
-- kamp başlamadan (ayna_baslangic yokken) HİÇBİR satır ateşlenmez.
create table if not exists kamp_senaryosu (
  id           uuid        primary key default gen_random_uuid(),
  olay_kodu    text        not null unique,
  -- 'kamp_gorelli' = ayna_baslangic + (gun-1) gün + saat:00
  -- 'olay_gorelli' = baz_olay ateşlendikten sonra sonra_dk dakika
  tetik_tipi   text        not null check (tetik_tipi in ('kamp_gorelli','olay_gorelli')),
  gun          integer,
  saat         integer,
  baz_olay     text,        -- olay_gorelli: hangi olay_kodu'ndan sonra
  sonra_dk     integer,     -- olay_gorelli: kaç dakika sonra
  -- eylem: ayar_ac/ayar_kapat (settings bayrağı), push (herkese), fonksiyon (kayıtlı)
  eylem_tipi   text        not null check (eylem_tipi in ('ayar_ac','ayar_kapat','push','fonksiyon')),
  eylem_hedef  text        not null,   -- settings key | fonksiyon adı
  eylem_baslik text,                    -- push başlığı
  eylem_deger  text,                    -- push gövdesi / ayar değeri
  on_kosul     text,                    -- opsiyonel ön-koşul kodu (ön-uçuş)
  durum        text        not null default 'bekliyor' check (durum in ('bekliyor','atesledi','atlandi')),
  atesleme_zamani timestamptz,
  sira         integer     not null default 0,
  created_at   timestamptz not null default now()
);

create index if not exists kamp_senaryosu_durum_idx on kamp_senaryosu (durum, sira);

alter table kamp_senaryosu enable row level security;
revoke all on kamp_senaryosu from anon, authenticated;

-- ÇEKİRDEK SEED — kampın görev-motoru mekaniklerini göreli zamanlarda AÇAR.
-- Hepsi 'bekliyor'; ayna_baslangic set olana (kamp başlayana) dek ateşlenmez.
-- Emre bunları /admin'den düzenleyebilir/erteleyebilir. (Bilinçli olarak
-- muhafazakâr bir set: yalnız görev-motoru bayrakları — kamp operasyonu değil.)
insert into kamp_senaryosu (olay_kodu, tetik_tipi, gun, saat, eylem_tipi, eylem_hedef, eylem_baslik, eylem_deger, sira) values
  ('gun1_altin_gorev_ac',   'kamp_gorelli', 1, 10, 'ayar_ac', 'altin_gorev_acik',    null, 'true', 10),
  ('gun1_iki_kapi_ac',      'kamp_gorelli', 1, 14, 'ayar_ac', 'iki_kapi_acik',       null, 'true', 20),
  ('gun2_johari_ac',        'kamp_gorelli', 2,  9, 'ayar_ac', 'johari_capraz_acik',  null, 'true', 30),
  ('gun2_tanik_ac',         'kamp_gorelli', 2, 10, 'ayar_ac', 'tanik_gorevi_acik',   null, 'true', 40),
  ('gun2_mini_konsey_ac',   'kamp_gorelli', 2, 11, 'ayar_ac', 'mini_konsey_acik',    null, 'true', 50),
  ('gun2_tahmin_sapma_ac',  'kamp_gorelli', 2, 16, 'ayar_ac', 'tahmin_sapmasi_acik', null, 'true', 60),
  ('gun2_kanit_garanti_ac', 'kamp_gorelli', 2, 20, 'ayar_ac', 'kanit_garantisi_acik',null, 'true', 70),
  ('gun3_zincir_ac',        'kamp_gorelli', 3,  9, 'ayar_ac', 'kamp_zinciri_acik',   null, 'true', 80),
  ('gun3_kume_ac',          'kamp_gorelli', 3, 12, 'ayar_ac', 'kume_gorev_acik',     null, 'true', 90)
on conflict (olay_kodu) do nothing;
