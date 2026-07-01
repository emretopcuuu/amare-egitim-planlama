-- GELİŞİM DOSYASI — kampsonu tavsiye mektubu. lib/sentez.ts'in ürettiği
-- sentezden AI ile bir kez üretilir, stabil kalsın diye saklanır (her açılışta
-- yeniden üretilmez; hem tutarlı hem maliyet dostu). Ayna Koçu da bu mektubun
-- özetinden haberdar olur — mektup ile koç aynı beyni paylaşır.
-- Çerçeve: ELEŞTİRİ değil GELİŞİM (güçlü yan + fırsat + somut tavsiye + 90 gün).
create table if not exists gelisim_dosyasi (
  participant_id uuid primary key references participants(id) on delete cascade,
  mektup text not null,            -- tam tavsiye mektubu (kişiye gösterilen)
  ozet jsonb not null default '{}'::jsonb, -- koç için kompakt özet (değer-davranış, tavsiye başlıkları)
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
-- RLS açık + sıfır policy (deny-all) — tüm erişim yalnız service-role ile.
alter table gelisim_dosyasi enable row level security;
