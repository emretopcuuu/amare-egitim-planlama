-- FAZ 7 — AKTİVASYON KATMANI (görev yapmayanlar).
-- [7.2] "Neden?" — süresi dolan görevin yerine tek-dokunuş sebep; motoru
-- yönlendirir (anlamadım→somutluk, çekindim→şefkat, vakit→mikro, ilgi→farklı kas).
-- missions.kacirma_sebebi: 'vakit' | 'anlamadim' | 'cekindim' | 'ilgi_yok' | null.
alter table missions add column if not exists kacirma_sebebi text;

-- [7.3] Yeniden giriş merdiveni: kişinin şu anki "giriş basamağı". Sessizleşip
-- dönene önce zorluk-0 (tek dokunuş) → 1 (20 dk) → normal. participants'a yazılır.
-- 0 = tek dokunuş, 1 = küçük, 2 = normal (varsayılan). tik.ts okur/günceller.
alter table participants add column if not exists yeniden_giris_basamak smallint not null default 2;

-- [7.4] Akran kurtarma görevi kaydı: sessizleşen kişi (geride) bir aktifin
-- İSİMLİ görevine dönüşür; aktife geride olduğu ASLA söylenmez. Bu tablo
-- eşleştirmeyi ve çift taraflı kıvılcımı takip eder.
create table if not exists akran_kurtarma (
  id          uuid        primary key default gen_random_uuid(),
  mission_id  uuid        not null references missions(id) on delete cascade,
  aktif_id    uuid        not null references participants(id) on delete cascade,
  sessiz_id   uuid        not null references participants(id) on delete cascade,
  created_at  timestamptz not null default now(),
  check (aktif_id <> sessiz_id),
  unique (mission_id)
);
create index if not exists akran_kurtarma_sessiz_idx on akran_kurtarma (sessiz_id, created_at);

alter table akran_kurtarma enable row level security;
revoke all on akran_kurtarma from anon, authenticated;
