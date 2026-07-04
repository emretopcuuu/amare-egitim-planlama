-- Özellik 4 + 9 — Sesli Mektup (90 gün sonraki kendine) + Domino Görevi.
--
-- (4) sesli_mektuplar: Gün 2 akşamı kişi 90 gün sonraki kendine 60 sn'lik sesli
--     mektup kaydeder (storage 'sesler' bucket, mektup/{pid}-{uuid}.webm).
--     acilis_at = kayıt + 90 gün; 90-gün follow-up yüzeyi (Eylül Aynası) o
--     tarih geçince "Geçmişten mektubun var 🎧" kartını gösterir, GET
--     /api/sesli-mektup imzalı URL döner ve dinlendi_at'ı damgalar.
-- (9) missions.domino: Gün 3 sabahı herkese düşen TEK "domino" görevinin
--     (kind='cesaret') sorgulanabilir izi — kampın en güçlü içgörüsünü BUGÜN
--     kamp dışından birine taşı. 90-gün follow-up bu izi referans alır
--     ("O gün söylediğin şey ne oldu?").

-- (4) Sesli mektuplar
create table if not exists sesli_mektuplar (
  id             uuid        primary key default gen_random_uuid(),
  participant_id uuid        not null references participants(id) on delete cascade,
  audio_path     text        not null,
  sure_sn        integer,
  acilis_at      timestamptz not null,
  dinlendi_at    timestamptz,
  created_at     timestamptz default now()
);

create index if not exists sesli_mektuplar_katilimci_idx on sesli_mektuplar (participant_id);

alter table sesli_mektuplar enable row level security;
revoke all on sesli_mektuplar from anon, authenticated;

-- (9) Domino izi: kolon missions'ta — ayrı tablo/kind yerine sorgulanabilir bayrak.
alter table missions add column if not exists domino boolean not null default false;

-- Senaryo satırları: ikisi de 'bekliyor' — kamp başlamadan (ayna_baslangic
-- yokken) orkestratör HİÇBİR satırı ateşlemez (lib/orkestrator.ts).
--   • Gün 2 21:00 — herkese sesli mektup görevi (fonksiyon: lib/sesliMektup.ts)
--   • Gün 3 10:00 — herkese domino görevi (fonksiyon: lib/domino.ts)
insert into kamp_senaryosu (olay_kodu, tetik_tipi, gun, saat, eylem_tipi, eylem_hedef, eylem_baslik, eylem_deger, sira) values
  ('gun2_sesli_mektup_ac', 'kamp_gorelli', 2, 21, 'fonksiyon', 'gun2_sesli_mektup_ac', null, null, 76),
  ('gun3_domino_ac',       'kamp_gorelli', 3, 10, 'fonksiyon', 'gun3_domino_ac',       null, null, 93)
on conflict (olay_kodu) do nothing;
