-- [B#19] YOL ARKADAŞI — kişi şahitleri arasından BİR yol arkadaşı seçer (kendi
-- seçer). İkisi de aynı gün adım atınca "ortak alev" büyür — beraber sorumluluk.
-- Her kişinin seçtiği tek arkadaş (secen_id PK). Karşılıklı olması şart değil;
-- ortak alev iki kişinin de o gün işaretlemesinden hesaplanır (kod, ek kolon yok).
create table if not exists yol_arkadasi (
  secen_id uuid primary key references participants(id) on delete cascade,
  arkadas_id uuid not null references participants(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table yol_arkadasi enable row level security;
