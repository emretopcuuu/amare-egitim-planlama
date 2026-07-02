-- [10] ZİRVEYİ ÖLÇ — kamp doruğunun (Mühür Açılışı + rapor) hemen ardından,
-- kişi tek kelime + 0-10 slider ile o anki dönüşüm hissini işaretler. Peak-End
-- kuralının "peak" ölçümü: Eylül analiz kapısına veri (kimlik ekseni), tek kelime
-- [7] Mühür +30 açılışında geri çalınır. Kişi başına tek kayıt (write-once).
create table if not exists zirve_olcum (
  participant_id uuid primary key references participants(id) on delete cascade,
  kelime text not null,
  puan smallint not null check (puan between 0 and 10),
  created_at timestamptz not null default now()
);

alter table zirve_olcum enable row level security;
revoke all on zirve_olcum from anon, authenticated;
