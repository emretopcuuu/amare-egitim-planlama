-- [1.5] SALON DAVETİ — Gün 3 75. dk telefon anı. Kişi gerçek listesinden bir
-- isim yazar; AYNA pusula + davet tekniğiyle KISA bir davet taslağı üretir.
-- Kişi düzenler, KENDİ WhatsApp'ından KENDİSİ atar, "Gönderdim" işaretler.
-- Sistem hiçbir dış mesaj GÖNDERMEZ — yalnız taslak verir. Temmuz 72-saat
-- protokolü (2.2 Gün2) bu davetin takibine bağlanır.
create table if not exists salon_daveti (
  id             uuid        primary key default gen_random_uuid(),
  participant_id uuid        not null references participants(id) on delete cascade,
  hedef_ad       text        not null,        -- davet edilen kişinin adı (serbest metin)
  taslak         text        not null,        -- AYNA'nın ürettiği/kişinin düzenlediği metin
  gonderildi_at  timestamptz,                 -- kişi "Gönderdim" dediğinde
  created_at     timestamptz not null default now()
);

create index if not exists salon_daveti_kisi_idx on salon_daveti (participant_id, created_at);

alter table salon_daveti enable row level security;
revoke all on salon_daveti from anon, authenticated;
