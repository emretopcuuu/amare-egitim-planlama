-- KVKK sızıntısı: ai_istek_log.participant_id FK'siz olduğu için katılımcı
-- silinince (KVKK "veri sil") bu AI istek logları kalıyordu (sessiz iz).
-- Denetimde 466 yetim satır bulundu. Önce yetimleri temizle, sonra ON DELETE
-- CASCADE FK ekle ki bundan sonra participant silmesi bunu da götürsün.
delete from ai_istek_log l
where not exists (select 1 from participants p where p.id = l.participant_id);

alter table ai_istek_log
  add constraint ai_istek_log_participant_fk
  foreign key (participant_id) references participants(id) on delete cascade;
