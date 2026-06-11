-- Seçilen geliştirme önerileri için ileriye dönük şema hazırlığı.

-- "90 gün sonra aynaya tekrar bak": kamp sonrası Dalga 4 açılabilmeli.
alter table public.waves drop constraint waves_id_check;
alter table public.waves add constraint waves_id_check check (id between 1 and 4);

-- Kamp sonrası e-posta takibi için opsiyonel e-posta alanı (CSV'de opsiyonel kolon).
alter table public.participants add column email text;

-- "Kendini ne kadar tanıyorsun?" tahmin oyunu: Dalga 3 kapanmadan önce
-- herkes en yüksek/en düşük dış puan alacağı özelliği tahmin eder.
create table public.predictions (
  participant_id  uuid primary key references public.participants(id) on delete cascade,
  top_trait_id    smallint not null references public.traits(id),
  bottom_trait_id smallint not null references public.traits(id),
  created_at      timestamptz not null default now()
);
alter table public.predictions enable row level security;

-- AI "Ayna Mektubu": Faz 4'te üretilip burada saklanır (yeniden üretim maliyetli).
create table public.mirror_letters (
  participant_id uuid primary key references public.participants(id) on delete cascade,
  content        text not null,
  created_at     timestamptz not null default now()
);
alter table public.mirror_letters enable row level security;
