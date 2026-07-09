-- KVKK "her yerden silme" denetimi (#18)
-- Katılımcı silme, participants(id)'ten FK ON DELETE CASCADE zincirine dayanır.
-- Yeni bir tablo participant'a FK'siz bir kolonla eklenirse, kişi silinince o
-- tabloda SESSİZ İZ kalır. Bu script o riski yakalar. Supabase SQL editöründe
-- ya da MCP execute_sql ile periyodik çalıştır (yeni tablo/kolon ekledikçe).

-- (1) participants(id)'e FK ile bağlı tablolar + silme kuralı.
--     Beklenen: CASCADE (istisna: audit_log.admin_id, mentorluk_kayit.secilen_id,
--     soz_durtme.gonderen → bilinçli SET NULL). CASCADE/SET NULL dışında bir
--     kural çıkarsa (NO ACTION/RESTRICT) → silme ya bloklanır ya iz bırakır.
select tc.table_name, kcu.column_name, rc.delete_rule
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu on kcu.constraint_name = tc.constraint_name
join information_schema.constraint_column_usage ccu on ccu.constraint_name = tc.constraint_name
join information_schema.referential_constraints rc on rc.constraint_name = tc.constraint_name
where tc.constraint_type = 'FOREIGN KEY'
  and ccu.table_name = 'participants' and ccu.column_name = 'id'
order by rc.delete_rule, tc.table_name;

-- (2) SESSİZ İZ ADAYLARI: uuid kolon (PK 'id' hariç) ki participants'a FK'si YOK.
--     Çıkanların çoğu başka tabloya (missions/photos/pairs…) referanstır ve
--     dolaylı cascade olur; ama participant'ı DOĞRUDAN tutan FK'siz bir kolon
--     çıkarsa (ör. eskiden ai_istek_log.participant_id) → gerçek KVKK açığı.
--     Bunun için o kolona `references participants(id) on delete cascade` ekle.
with fk as (
  select kcu.table_name, kcu.column_name
  from information_schema.table_constraints tc
  join information_schema.key_column_usage kcu on kcu.constraint_name = tc.constraint_name
  join information_schema.constraint_column_usage ccu on ccu.constraint_name = tc.constraint_name
  where tc.constraint_type = 'FOREIGN KEY'
    and ccu.table_name = 'participants' and ccu.column_name = 'id'
)
select c.table_name, c.column_name, c.data_type
from information_schema.columns c
where c.table_schema = 'public' and c.data_type = 'uuid' and c.column_name <> 'id'
  and not exists (select 1 from fk where fk.table_name = c.table_name and fk.column_name = c.column_name)
order by c.table_name, c.column_name;

-- (3) Kişisel metin kolonları (telefon/isim/eposta/kod) participants dışında.
--     Beklenen: hiç (yalnız participants tutmalı). Çıkarsa elle temizlik gerekir.
select table_name, column_name, data_type from information_schema.columns
where table_schema = 'public' and table_name <> 'participants'
  and column_name ~* 'phone|telefon|full_name|login_code|email|eposta|tam_ad'
order by table_name, column_name;
