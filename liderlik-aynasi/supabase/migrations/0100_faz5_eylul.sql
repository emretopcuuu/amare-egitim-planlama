-- FAZ 5 — EYLÜL KANIT AYI. İki yeni tablo + Eylül senaryo satırları.
-- eylul_kanit_modu bayrağı zaten 0094'te Gün 45'te açılıyor; buradaki satırlar
-- somut kanıt görevlerini + Eylül Aynası çağrısını ekler. Hepsi 'bekliyor'.

-- [5.2] EYLÜL AYNASI (mini-360): kişi 2 aylık yolculuğuna bakıp tek cümle + 0-10
-- puan bırakır. Kamp mühründen bu yana "before/after" ölçümü.
create table if not exists eylul_aynasi (
  id             uuid        primary key default gen_random_uuid(),
  participant_id uuid        not null references participants(id) on delete cascade,
  cevap          text        not null,
  puan           smallint    not null check (puan between 0 and 10),
  created_at     timestamptz not null default now(),
  unique (participant_id)
);
create index if not exists eylul_aynasi_pid_idx on eylul_aynasi (participant_id);
alter table eylul_aynasi enable row level security;
revoke all on eylul_aynasi from anon, authenticated;

-- [5.4] İŞ VERİSİ KÖPRÜSÜ: kişi haftalık gerçek iş sayılarını girer (görüşme,
-- kayıt, takip). AYNA'nın görevlerini lafla değil veriyle bağlar. Rakamlar
-- yalnızca kişinin kendisine + admin agregatına görünür (deny-all + sunucu DTO).
create table if not exists is_verisi (
  id             uuid        primary key default gen_random_uuid(),
  participant_id uuid        not null references participants(id) on delete cascade,
  hafta          smallint    not null,               -- kamptan bu yana kaçıncı hafta
  gorusme        smallint    not null default 0 check (gorusme  >= 0),
  kayit          smallint    not null default 0 check (kayit    >= 0),
  takip          smallint    not null default 0 check (takip    >= 0),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (participant_id, hafta)
);
create index if not exists is_verisi_pid_idx on is_verisi (participant_id);
alter table is_verisi enable row level security;
revoke all on is_verisi from anon, authenticated;

-- Senaryo: Eylül kanıt görevleri (Gün 46/53/60) + İş verisi köprüsü çağrısı
-- (Gün 46) + Eylül Aynası çağrısı (Gün 62). ~17 Temmuz başlarsa Gün 46 ≈ 31 Ağ,
-- Gün 62 ≈ 16 Eyl.
insert into kamp_senaryosu (olay_kodu, tetik_tipi, gun, saat, eylem_tipi, eylem_hedef, eylem_baslik, eylem_deger, sira) values
  ('eylul_kanit1', 'kamp_gorelli', 46, 9,  'fonksiyon', 'eylul_kanit1', null, null, 151),
  ('is_verisi_cagri', 'kamp_gorelli', 46, 12, 'push', 'is_verisi', '📊 İş Verisi Köprüsü', 'Eylül kanıt ayı. Bu haftanın gerçek sayılarını gir: /is-verisi', 152),
  ('eylul_kanit2', 'kamp_gorelli', 53, 9,  'fonksiyon', 'eylul_kanit2', null, null, 153),
  ('eylul_kanit3', 'kamp_gorelli', 60, 9,  'fonksiyon', 'eylul_kanit3', null, null, 154),
  ('eylul_aynasi_cagri', 'kamp_gorelli', 62, 10, 'push', 'eylul_aynasi', '🪞 Eylül Aynası', 'İki ay geçti. Aynaya bak: kim olmuştun, kim oldun? /eylul-aynasi', 155)
on conflict (olay_kodu) do nothing;
