-- Onboarding hatırlatma geçmişi: kime, hangi aşama için, hangi kanaldan, ne zaman
-- hatırlatıldı. Soğuma (aynı kişiye çok sık gönderme), geçmiş gösterimi ve
-- "hatırlatma sonrası tamamlayan" dönüşüm ölçümü için. Admin-only; RLS açık, policy
-- yok (service-role dışı erişim yok).
create table if not exists onboarding_hatirlatma (
  id bigint generated always as identity primary key,
  participant_id uuid not null references participants(id) on delete cascade,
  hedef text not null check (hedef in ('degerler', 'oyun')),
  kanal text not null default 'uygulama', -- 'push' (telefon bildirimi gitti) | 'uygulama' (yalnız gelen kutusu)
  created_at timestamptz not null default now()
);
create index if not exists onboarding_hatirlatma_kisi_idx
  on onboarding_hatirlatma (participant_id, hedef, created_at desc);
create index if not exists onboarding_hatirlatma_zaman_idx
  on onboarding_hatirlatma (hedef, created_at desc);
alter table onboarding_hatirlatma enable row level security;
