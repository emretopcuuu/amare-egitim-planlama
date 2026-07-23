-- AI TOKEN MUHASEBESİ — ai_istek_log artık her Anthropic çağrısının modelini +
-- girdi/çıktı token'ını tutar (yanıt usage'ından). aynaClient wrapper'ı otomatik
-- yazar → kesin günlük token/maliyet raporu (tahmin değil). participant_id
-- nullable: sistem çağrıları (radyo, karne) kişisiz olabilir.
alter table ai_istek_log add column if not exists model text;
alter table ai_istek_log add column if not exists girdi_token int;
alter table ai_istek_log add column if not exists cikti_token int;
alter table ai_istek_log alter column participant_id drop not null;
