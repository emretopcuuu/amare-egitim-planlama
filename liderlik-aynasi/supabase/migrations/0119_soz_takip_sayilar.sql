-- FAZ 3/4 (kamp sonrası motor) — akşam check-in artık boolean'ın yanında
-- SAYI taşıyabilir: o gün kaç görüşme yapıldı (haftalık kota barı için) ve
-- kaç kişisel KAYIT alındı (Kayıt Zili kutlaması + şahitlere müjde push'u).
alter table public.soz_takip
  add column if not exists gorusme_sayisi int,
  add column if not exists kayit_sayisi int not null default 0;
