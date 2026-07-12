-- #2 SICAK LİSTE: kişinin gerçek aday/çevre listesi. Kamp coşkusu en yüksekken
-- (Gün 1 akşamı) isim çıkarttırılır; kamp görevleri bu isimlerle ÇALIŞIR ve
-- kapanışta 90-gün planına akar. Şu ana dek sistemde hiç yoktu — isimler serbest
-- metinde kayboluyordu. Admin-only erişim (RLS açık, policy yok = deny-all).
create table if not exists sicak_liste (
  id bigint generated always as identity primary key,
  participant_id uuid not null references participants(id) on delete cascade,
  isim text not null,
  aciklama text,                    -- opsiyonel kısa not (nasıl tanışıldı vb.)
  durum text not null default 'aday'
    check (durum in ('aday','temas','randevu','kayit','pas')),
  sira int not null default 0,      -- kişinin sıraladığı öncelik
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists sicak_liste_kisi_idx on sicak_liste (participant_id, sira);
alter table sicak_liste enable row level security;
