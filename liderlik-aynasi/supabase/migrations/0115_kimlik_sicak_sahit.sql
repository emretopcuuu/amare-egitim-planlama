-- Özellik 2 + 3 + 5 — Kimlik Cümlesi Takibi, Sıcak An Yakalama, Şahit Perspektifi.
--
-- (2) kimlik_cumleleri: yanıtlardan damıtılan kendini-sınırlayan kimlik
--     kalıpları ("ben zaten çekingenim" gibi). Motor bu inancı davranışla
--     çürüten görevler kurar (missions.kimlik_cumle_id izi); puan ≥7 yanıtlardan
--     tek cümlelik karşı-kanıtlar birikir (karsit_kanitlar). Her 10. puanlı
--     görevde cümle + kanıtlar yüzleşme kartı olarak döner (yuzlesme_at),
--     kişi "Artık söyleyemem" derse birakildi_at mühürlenir.
-- (3) participants.sicak_an: check-in / görev yanıtı / koçu mesajındaki güçlü
--     duygu sinyalinin önbelleği ({tur, kaynak, ozet, at}) — tik, tazeyse
--     (<45 dk) o kişiye öncelik verip duyguya dokunan mikro-görev üretir,
--     üretince temizler. En taze sinyal kazanır (üzerine yazılır).
-- (5) sahit_gozlemleri: B'ye verilen "10 dk [Ad]'ı gözle; onda gördüğün,
--     kendisinin görmediği BİR gücü yaz" görevinin (kind='sahit') yanıtı.
--     A'nın SONRAKİ görevi bu gözlemle açılır ("Dün biri sende şunu gördü: …")
--     ve gözlem kullanildi_at ile mühürlenir.

-- (2) Kimlik cümleleri
create table if not exists kimlik_cumleleri (
  id                uuid        primary key default gen_random_uuid(),
  participant_id    uuid        not null references participants(id) on delete cascade,
  cumle             text        not null,
  kaynak_mission_id uuid,
  karsit_kanitlar   jsonb       not null default '[]',
  yuzlesme_at       timestamptz,
  birakildi_at      timestamptz,
  created_at        timestamptz default now()
);

create index if not exists kimlik_cumleleri_katilimci_idx on kimlik_cumleleri (participant_id);

alter table kimlik_cumleleri enable row level security;
revoke all on kimlik_cumleleri from anon, authenticated;

-- Bu görev hangi kimlik cümlesini çürütmek için kurgulandı (kanıt toplama izi).
alter table missions add column if not exists kimlik_cumle_id uuid;

-- (3) Sıcak an önbelleği: {tur:'kirilganlik'|'cosku'|'hayal_kirikligi',
--     kaynak:'checkin'|'gorev'|'kocu', ozet, at}
alter table participants add column if not exists sicak_an jsonb;

-- (5) Şahit gözlemleri
create table if not exists sahit_gozlemleri (
  id             uuid        primary key default gen_random_uuid(),
  gozleyen_id    uuid        not null references participants(id) on delete cascade,
  hedef_id       uuid        not null references participants(id) on delete cascade,
  gozlem         text        not null,
  mission_id     uuid,
  kullanildi_at  timestamptz,
  created_at     timestamptz default now()
);

create index if not exists sahit_gozlemleri_hedef_idx on sahit_gozlemleri (hedef_id);

alter table sahit_gozlemleri enable row level security;
revoke all on sahit_gozlemleri from anon, authenticated;

-- missions.kind CHECK'i genişlet: yeni 'sahit' türü + kodun ZATEN insert ettiği
-- ama canlı constraint'te unutulmuş 'mentorluk' (lib/ayna.ts mentorlukGorevUret)
-- ve 'serbest' (tik.ts [E6] görev çek kartı) türleri — bunlar canlıda sessizce
-- reddediliyordu (insert hataları yutuluyor), bu migration gizli borcu da kapatır.
alter table missions drop constraint if exists missions_kind_check;
alter table missions add constraint missions_kind_check
  check (kind in (
    'gozlem','cesaret','yansima','gizli','tahmin',
    'soz','senkron','simulasyon','bag','mentorluk','serbest','sahit'
  ));

-- Aynı gizli borç status'ta: 'secim_bekliyor' (İki Kapı / görev çek) kodda var,
-- canlı CHECK'te yoktu.
alter table missions drop constraint if exists missions_status_check;
alter table missions add constraint missions_status_check
  check (status in ('pending','submitted','scored','expired','secim_bekliyor'));
