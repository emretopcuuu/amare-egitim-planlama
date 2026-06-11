-- Faz 6: "90 gün sonra aynaya tekrar bak" — Dalga 4 kaydı.
-- waves_id_check kısıtı 0005'te 1-4'e genişletilmişti; satır kapalı başlar,
-- kamptan ~90 gün sonra admin panelden açılır.
insert into public.waves (id, name, is_open) values
  (4, 'Dalga 4 — 90 Gün Sonra', false);
