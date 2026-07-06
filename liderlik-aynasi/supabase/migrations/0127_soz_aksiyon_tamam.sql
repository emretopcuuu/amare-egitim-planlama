-- [FAZ 6 · Yaşayan Plan] Söze mühürlenen somut aksiyon adımları eskiden /takip'te
-- salt-okunur bir hatırlatma listesiydi. Artık kişi her adımı TAMAMLANDI olarak
-- işaretleyebilir → statik plan yaşayan bir kontrol listesine döner.
-- soz.aksiyonlar sabit sıralı bir dizi (söz mühürlenince kilitlenir); tamamlanma
-- (participant_id, aksiyon_index) ile takip edilir.
create table if not exists soz_aksiyon_tamam (
  id             uuid        primary key default gen_random_uuid(),
  participant_id uuid        not null references participants(id) on delete cascade,
  aksiyon_index  smallint    not null,
  tamamlandi_at  timestamptz not null default now(),
  unique (participant_id, aksiyon_index)
);

alter table soz_aksiyon_tamam enable row level security;
revoke all on soz_aksiyon_tamam from anon, authenticated;
