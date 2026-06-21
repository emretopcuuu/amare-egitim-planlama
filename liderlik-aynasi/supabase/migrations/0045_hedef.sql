-- FAZ A — HEDEF MODÜLÜ (Gün 2). Nedenler (Pusula) keşfedildikten SONRA açılır.
-- Önce "neredesin?" (başlangıç noktası: yeni / başlangıç / deneyimli / lider),
-- sonra nedenlere bağlı 90 günlük somut hedefler. Çıktı özet halinde mühürlenir;
-- bundan sonra görevler, Ayna Raporu ve Söz bu özeti okur (pusulaOzeti gibi).
create table if not exists public.hedef (
  participant_id uuid primary key references public.participants(id) on delete cascade,
  baslangic_noktasi text,            -- 'yeni' | 'baslangic' | 'deneyimli' | 'lider'
  deneyim_ay smallint,               -- işin içinde ne kadardır (ay) — opsiyonel
  baslangic_detay text,              -- nerede olduğuna dair serbest metin
  hedefler jsonb not null default '[]'::jsonb,
  -- hedefler: [{ metin, olcut, hedef_deger, zaman, neden_bagi }]
  ozet text,                          -- damıtılmış özet (downstream AI enjeksiyonu)
  asama text not null default 'baslangic', -- baslangic | hedef | netlestir | tamam
  tamamlandi_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.hedef enable row level security;
revoke all on public.hedef from anon, authenticated;

-- Hedef sohbeti transkripti (Pusula'daki pusula_mesajlar ile aynı desen).
create table if not exists public.hedef_mesajlar (
  id bigint generated always as identity primary key,
  participant_id uuid not null references public.participants(id) on delete cascade,
  rol text not null,                  -- 'kullanici' | 'ayna'
  icerik text not null,
  created_at timestamptz not null default now()
);
alter table public.hedef_mesajlar enable row level security;
revoke all on public.hedef_mesajlar from anon, authenticated;
create index if not exists hedef_mesajlar_pid_idx
  on public.hedef_mesajlar (participant_id, created_at);

-- Admin kapısı: Hedef modülü 2. gün açılır (Pusula penceresinden bağımsız).
insert into public.settings (key, value)
  values ('hedef_acik', 'false')
  on conflict (key) do nothing;
