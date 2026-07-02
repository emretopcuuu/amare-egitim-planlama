-- [E8] KAMP İÇİ KAYIP RADARI — WhatsApp gönderim izi. Mevcut churn_radar (nudged_at,
-- admin_alerted_at) üzerine, kamp modunda drift'te giden WhatsApp'ın tek-seferlik
-- guard'ı. (Kamp SONRASI churn merdiveni ayrı — bu kamp İÇİ versiyon.)
alter table churn_radar add column if not exists wa_sent_at timestamptz;
