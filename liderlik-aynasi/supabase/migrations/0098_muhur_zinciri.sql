-- [4.2] ARA MÜHÜR ZİNCİRİ — kamp sonrası dönemde sözün periyodik "yeniden
-- mühürlenmesi". Kamptaki söz zincirin İLK halkasıdır (soz tablosu); +30/+60/+90
-- günlerinde kişi sözünü yeniden okur ve tek cümlelik bir teyit ("hâlâ buradayım")
-- ekler. Bu teyitler görünür bir zincir oluşturur — süreklilik = kimlik.
create table if not exists muhur_zinciri (
  id             uuid        primary key default gen_random_uuid(),
  participant_id uuid        not null references participants(id) on delete cascade,
  halka          smallint    not null check (halka in (30, 60, 90)),
  teyit          text        not null,
  created_at     timestamptz not null default now(),
  unique (participant_id, halka)
);

create index if not exists muhur_zinciri_pid_idx on muhur_zinciri (participant_id);

alter table muhur_zinciri enable row level security;
revoke all on muhur_zinciri from anon, authenticated;

-- Senaryo: +60 ve +90 ara mühürlerini aç + kişiyi çağır. (+30 zaten 0094'te
-- 'muhur_plus30_acik' Gün 31'de açılıyor.) Hepsi 'bekliyor' — kamp başlayana dek
-- ateşlenmez.
insert into kamp_senaryosu (olay_kodu, tetik_tipi, gun, saat, eylem_tipi, eylem_hedef, eylem_baslik, eylem_deger, sira) values
  ('muhur30_cagri', 'kamp_gorelli', 31, 11, 'push', 'muhur_zinciri', '🔗 İlk Ara Mühür', '30 gün oldu. Sözünü yeniden oku, zincirine ilk halkayı ekle: /muhur-zinciri', 142),
  ('muhur60_ac',    'kamp_gorelli', 61, 10, 'ayar_ac', 'muhur_plus60_acik', null, 'true', 143),
  ('muhur60_cagri', 'kamp_gorelli', 61, 11, 'push', 'muhur_zinciri', '🔗 İkinci Ara Mühür', '60 gün. Zincirin uzuyor — sözünü teyit et: /muhur-zinciri', 144),
  ('muhur90_ac',    'kamp_gorelli', 89, 10, 'ayar_ac', 'muhur_plus90_acik', null, 'true', 145),
  ('muhur90_cagri', 'kamp_gorelli', 89, 11, 'push', 'muhur_zinciri', '🔗 Son Ara Mühür', '90 gün doldu. Zincirini tamamla: /muhur-zinciri', 146)
on conflict (olay_kodu) do nothing;
