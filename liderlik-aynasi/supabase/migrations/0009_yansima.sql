-- YANSIMAN (Faz 8): katılımcının ses profili.
-- İlk girişteki Ses Ritüeli'nde alınan kayıt, ElevenLabs klonu ve
-- "ilk selamlama" ses dosyasının izi burada tutulur. Onay (consent)
-- vermeyen katılımcı için status 'yok' kalır ve ritüel bir daha sorulmaz.
create table if not exists voice_profiles (
  participant_id uuid primary key references participants(id) on delete cascade,
  consent boolean not null default false,
  status text not null default 'yok'
    check (status in ('yok', 'kayitli', 'klonlandi', 'hata')),
  voice_id text,
  sample_path text,
  beklenti text,
  greeting_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table voice_profiles enable row level security;
revoke all on voice_profiles from anon, authenticated;

-- Ses dosyaları için özel bucket: public değil, erişim yalnızca
-- sunucunun ürettiği imzalı URL'lerle.
insert into storage.buckets (id, name, public)
values ('sesler', 'sesler', false)
on conflict (id) do nothing;
