-- DEĞERLER ÇALIŞMASI — onboarding'de Pusula'dan (nedenler) hemen önce gelen
-- değerler keşfi + 5-neden derinleşmesi. Tek satır/kişi; cevaplar JSONB.
-- Çekirdek (3 değer + 5-neden + final cümleler) zorunlu; refleksiyon teşvik.
-- Sonuç: 3 temel değer + "neden cümlesi" ana sayfada kimlik çapası olur.
create table if not exists degerler_calismasi (
  participant_id uuid primary key references participants(id) on delete cascade,
  cevaplar jsonb not null default '{}'::jsonb, -- adım kodu -> metin yanıt
  secilen_uc text[] not null default '{}',     -- 3 temel değer
  neden_cumlesi text,                           -- "Ben ... için yaşıyorum. Çünkü ..."
  basladi_at timestamptz default now(),
  tamamlandi_at timestamptz,
  updated_at timestamptz default now()
);
-- RLS açık + sıfır policy (deny-all) — tüm erişim yalnız service-role ile.
alter table degerler_calismasi enable row level security;
