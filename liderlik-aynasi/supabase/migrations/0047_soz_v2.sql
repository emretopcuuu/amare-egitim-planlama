-- FAZ A — SÖZ v2. Kamp kapanışında: AI keşifler + hedef + neden + plandan bir söz
-- TASLAĞI şekillendirir; kişi düzenleyip onaylar; sonra KENDİ SESİYLE okur/kaydeder.
-- Söz, plandaki somut aksiyon adımlarını içerir. (Eski `pledges` tablosu — NM
-- sayaçları — dokunulmadan kalır; bu yeni, zengin söz modelidir.)
create table if not exists public.soz (
  participant_id uuid primary key references public.participants(id) on delete cascade,
  metin text,                                    -- şekillenmiş söz metni
  aksiyonlar jsonb not null default '[]'::jsonb, -- [{ metin, ufuk }] ufuk: 10|40|90
  voice_path text,                               -- kişinin kendi sesiyle okuduğu kayıt
  durum text not null default 'taslak',          -- taslak | onaylandi | sesli
  sekillendi_at timestamptz,
  kayit_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.soz enable row level security;
revoke all on public.soz from anon, authenticated;

-- 5 LİDER ŞAHİT/İMZA. Kişi kamptaki 5 lideri seçer; her lider en fazla 5 kişiye
-- şahit olabilir (kural uygulama katmanında sayımla uygulanır). Şahit sözü görür
-- ve imzalar → 90 gün boyunca adımları takip etme + dürtme yetkisi alır (Faz B).
create table if not exists public.soz_tanik (
  id uuid primary key default gen_random_uuid(),
  soz_sahibi uuid not null references public.participants(id) on delete cascade,
  witness_id uuid not null references public.participants(id) on delete cascade,
  imza_at timestamptz,                           -- şahit imzaladığında dolar
  created_at timestamptz not null default now(),
  unique (soz_sahibi, witness_id),
  check (soz_sahibi <> witness_id)
);
alter table public.soz_tanik enable row level security;
revoke all on public.soz_tanik from anon, authenticated;
create index if not exists soz_tanik_witness_idx on public.soz_tanik (witness_id);
create index if not exists soz_tanik_sahibi_idx on public.soz_tanik (soz_sahibi);

-- Admin kapısı: Söz v2 kamp kapanışında açılır.
insert into public.settings (key, value)
  values ('soz_v2_acik', 'false')
  on conflict (key) do nothing;
