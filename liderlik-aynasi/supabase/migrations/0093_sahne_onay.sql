-- [1.4] CANLI YOLCULUK SAHNE GÖRÜNÜMÜ — admin'in önceden seçtiği TEK katılımcının
-- 3 günlük yolculuğu sahnede gösterilir. sahne_onay=true olmadan kimse seçilemez
-- (mahremiyet). Seçili kişi settings 'sahne_yolculuk_kisi'nde tutulur.
alter table participants add column if not exists sahne_onay boolean not null default false;
