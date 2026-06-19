-- #8 "Bu görev neden sana özel?" — AYNA'nın ürettiği görevin, neden ÖZELLİKLE
-- bu kişiye verildiğine dair kısa, sıcak gerekçe. Ham veri ifşa etmez; adaya
-- gösterilir (sistemin kendisine göre ayarlandığını görsün → sahiplenme artar).
alter table missions add column if not exists neden text;
