-- KONUŞAN YANSIMA: "1 video + anlık ses" hattı.
-- Gece fısıltısının kişisel sesli/videolu hâli günde bir kez üretilir;
-- night_date (morning_date'in ikizi) tekrar üretimi engeller.
alter table voice_profiles add column if not exists night_date date;
