-- YANSIMAN B: "Aynan seni gördü" — ritüel fotoğrafından kişisel yansıma videosu.
-- Üretim AYNA tik'inde (cron) yürür: bekliyor → uretiliyor → hazir/hata.
alter table voice_profiles
  add column if not exists photo_path text,
  add column if not exists video_status text not null default 'yok'
    check (video_status in ('yok', 'bekliyor', 'uretiliyor', 'hazir', 'hata')),
  add column if not exists video_request_id text,
  add column if not exists video_path text,
  add column if not exists video_notified_at timestamptz;
