-- Yansıma pipeline v2: ayrı audio dosyası + ses ayarları
alter table voice_profiles
  add column if not exists audio_path text,
  add column if not exists video_script text;

-- Wan 2.7 model slug'ını settings'e kaydet (admin panelinden değiştirilebilir)
insert into settings (key, value, updated_at)
values ('yansima_model', 'wan2_7', now())
on conflict (key) do nothing;

-- video_status check'i genişlet: 'ses_uretiliyor' adımı
alter table voice_profiles drop constraint if exists voice_profiles_video_status_check;
alter table voice_profiles add constraint voice_profiles_video_status_check
  check (video_status in ('yok','bekliyor','uretiliyor','ses_uretiliyor','hazir','hata'));
