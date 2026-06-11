-- Geliştirme seed'i: 8 test katılımcısı için atamalar (her kişiye 2 gizli + 1 açık gözlem).
-- Rotasyon deseni: i → i+1, i+3 (shadow) ve i → i+5 (open), kod sırasına göre mod 8.
-- Faz 3'teki gerçek eşleştirme algoritması bunların yerini alacak; CSV import öncesi silinecek.
insert into public.assignments (observer_id, target_id, type)
select o.id, t.id, x.tip
from (values
  ('111111','222222','shadow'), ('111111','444444','shadow'), ('111111','666666','open'),
  ('222222','333333','shadow'), ('222222','555555','shadow'), ('222222','777777','open'),
  ('333333','444444','shadow'), ('333333','666666','shadow'), ('333333','888888','open'),
  ('444444','555555','shadow'), ('444444','777777','shadow'), ('444444','111111','open'),
  ('555555','666666','shadow'), ('555555','888888','shadow'), ('555555','222222','open'),
  ('666666','777777','shadow'), ('666666','111111','shadow'), ('666666','333333','open'),
  ('777777','888888','shadow'), ('777777','222222','shadow'), ('777777','444444','open'),
  ('888888','111111','shadow'), ('888888','333333','shadow'), ('888888','555555','open')
) as x(gozlemci_kod, hedef_kod, tip)
join public.participants o on o.login_code = x.gozlemci_kod
join public.participants t on t.login_code = x.hedef_kod;
