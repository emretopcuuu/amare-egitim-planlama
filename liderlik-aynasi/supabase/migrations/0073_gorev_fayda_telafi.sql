-- GÖREV DERİNLİĞİ — "Bu ödev neden önemli?" (fayda) + düşük-puan derinleştirme.
-- fayda: her görevin hayata/sahaya katkısını anlatan 1-2 cümle (AYNA üretir).
-- ipuclari: düşük puan sonrası üretilen derinleştirme görevinde "bu sefer şunu dene".
-- kaynak_id: derinleştirme görevinin hangi görevden doğduğu (sonsuz döngü guard'ı).
alter table public.missions add column if not exists fayda text;
alter table public.missions add column if not exists ipuclari text[];
alter table public.missions add column if not exists kaynak_id uuid references public.missions(id) on delete set null;
