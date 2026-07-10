-- #4 (takip) DAVID YAKALAMA: David Chung (CEO) oturumu, kariyer breakthrough için
-- en güçlü anlardan biri ama tek seferlik deneyim olarak kalıyordu — sorulan soru
-- ve alınan cevap hiçbir yere kaydedilmiyordu. David oturumu bitince kişiye özel
-- "ne sordun, ne aldın?" görevi düşer; yanıt bu bayrakla işaretlenir → sonraki
-- görevlere ve rapora akar. Ayrı tablo yok; missions üzerinde bir işaret.
alter table missions add column if not exists david_yakalama boolean not null default false;
create index if not exists missions_david_yakalama_idx
  on missions (participant_id) where david_yakalama;
