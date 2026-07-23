-- [E#39] GÖREV FAYDASI GERİ BİLDİRİMİ — kişi tamamladığı göreve "işine yaradı mı?"
-- diye tek dokunuşla oy verir. Bu geri bildirim görev üretimini besler (yaramayan
-- biçimler azalır, yarayan biçimler çoğalır).
-- NOT: missions.fayda ZATEN VAR ama o AI'nın ürettiği "işine nasıl katkı sağlar"
-- METNİ; bu kolon KULLANICININ oyu — ayrı tutuldu.
--   yararli = true  → işine yaradı
--   yararli = false → yaramadı
--   yararli = null  → henüz oy vermedi
alter table missions add column if not exists yararli boolean;
