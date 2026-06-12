-- KAMP COŞKUSU: kayma sesli mektubu + sabah yoklaması izleri
alter table churn_radar add column if not exists voice_path text;
alter table voice_profiles add column if not exists morning_date date;
